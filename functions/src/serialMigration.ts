import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {IDEMPOTENCY_TTL_DAYS, UNLOCK_CODE_RETRY_LIMIT} from "./config";
import {bucket, db} from "./firebaseAdmin";
import {
  CLEANUP_SUMMARY,
  PERSONAL_PRODUCT_FIELD_RESET,
  ResolvedOwner,
  ResolvedSerial,
  SerialMigrationDryRunResponse,
  SerialMigrationExecuteResponse,
  SerialMigrationInputRow,
  SerialMigrationResultRow,
  SerialMigrationValidationRow,
  createInputChecksum,
  generateUnlockCode,
  normalizeDryRunRequest,
  normalizeExecuteRequest,
  summarizeValidation,
  validationTokenFor,
} from "./serialMigrationModel";

const PRODUCTS = "products";
const USERS = "users";
const SERIALS = "serial_numbers";
const OPERATIONS = "admin_serial_migration_operations";
const LOCKS = "_internal_serial_migration_locks";
const UNLOCK_CODES = "_internal_unlock_code_reservations";
const TRANSFERS = "product_transfer_invitations";

export const dryRunSerialMigration = onCall(async (request): Promise<SerialMigrationDryRunResponse> => {
  assertSystemAdmin(request.auth?.token);
  const input = parseDryRun(request.data);
  const rows = await validateRows(input.mode, input.rows);
  const validationToken = validationTokenFor(rows);

  return {
    operationId: input.operationId,
    mode: input.mode,
    validationToken,
    rows,
    summary: summarizeValidation(rows),
  };
});

export const executeSerialMigration = onCall(async (request): Promise<SerialMigrationExecuteResponse> => {
  assertSystemAdmin(request.auth?.token);
  const input = parseExecute(request.data);
  if (!input.acknowledgedPermanentDeletion) {
    throw new HttpsError("failed-precondition", "Permanent data deletion acknowledgement is required.");
  }

  const validationRows = await validateRows(input.mode, input.rows);
  const readyRows = validationRows.filter((row) => row.executable);
  const expectedPhrase = `MIGRATE ${readyRows.length} SERIALS`;
  if (input.confirmationPhrase !== expectedPhrase) {
    throw new HttpsError("failed-precondition", `Confirmation phrase must be ${expectedPhrase}.`);
  }
  if (validationTokenFor(validationRows) !== input.validationToken) {
    throw new HttpsError("aborted", "Migration data changed after validation. Re-run validation before executing.");
  }

  const started = Date.now();
  const operationRef = db.collection(OPERATIONS).doc(input.operationId);
  await operationRef.set({
    operationId: input.operationId,
    mode: input.mode,
    actorUid: request.auth?.uid || null,
    actorEmail: typeof request.auth?.token.email === "string" ? request.auth.token.email : null,
    reason: input.reason,
    inputChecksum: input.inputChecksum || createInputChecksum(input.rows),
    validationToken: input.validationToken,
    status: "running",
    totalRows: input.rows.length,
    readyRows: readyRows.length,
    blockedRows: validationRows.length - readyRows.length,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: ttlTimestamp(),
  }, {merge: true});

  const results: SerialMigrationResultRow[] = [];
  for (const validationRow of validationRows) {
    if (!validationRow.executable) {
      results.push({
        rowNumber: validationRow.rowNumber,
        mode: validationRow.mode,
        sourceProductId: validationRow.sourceProductId,
        targetId: validationRow.targetId,
        serialNumber: validationRow.sourceSerial?.serialNumber || "",
        ownership: "none",
        status: "skipped",
        message: validationRow.conflicts.join("; ") || "Row was not executable.",
        storageWarnings: [],
      });
      continue;
    }

    try {
      const result = await executeReadyRow(input.operationId, validationRow);
      results.push(result);
    } catch (error) {
      logger.error("Serial migration row failed", {operationId: input.operationId, row: validationRow.rowNumber, error});
      results.push({
        rowNumber: validationRow.rowNumber,
        mode: validationRow.mode,
        sourceProductId: validationRow.sourceProductId,
        targetId: validationRow.targetId,
        serialNumber: validationRow.sourceSerial?.serialNumber || "",
        ownership: validationRow.sourceOwner ? "removed" : "none",
        status: "failed",
        message: error instanceof Error ? error.message : "Migration row failed.",
        storageWarnings: [],
      });
    }
  }

  await operationRef.set({
    status: results.some((row) => row.status === "failed") ? "partial" : "complete",
    completedAt: FieldValue.serverTimestamp(),
    successCount: results.filter((row) => row.status === "success").length,
    failureCount: results.filter((row) => row.status === "failed").length,
    skippedCount: results.filter((row) => row.status === "skipped").length,
    storageWarningCount: results.reduce((count, row) => count + row.storageWarnings.length, 0),
  }, {merge: true});

  return {
    operationId: input.operationId,
    mode: input.mode,
    results,
    summary: {
      total: results.length,
      successful: results.filter((row) => row.status === "success").length,
      failed: results.filter((row) => row.status === "failed").length,
      skipped: results.filter((row) => row.status === "skipped").length,
      storageWarnings: results.reduce((count, row) => count + row.storageWarnings.length, 0),
      durationMs: Date.now() - started,
    },
  };
});

function assertSystemAdmin(token: Record<string, unknown> | undefined) {
  if (!token) throw new HttpsError("unauthenticated", "Authentication is required.");
  if (token.role !== "system-admin") throw new HttpsError("permission-denied", "System admin role is required.");
}

function parseDryRun(data: unknown) {
  try {
    return normalizeDryRunRequest(data);
  } catch (error) {
    throw new HttpsError("invalid-argument", error instanceof Error ? error.message : "Invalid dry-run request.");
  }
}

function parseExecute(data: unknown) {
  try {
    return normalizeExecuteRequest(data);
  } catch (error) {
    throw new HttpsError("invalid-argument", error instanceof Error ? error.message : "Invalid execute request.");
  }
}

async function validateRows(mode: "generic" | "sanitas", rows: SerialMigrationInputRow[]) {
  const duplicateMap = countDuplicates(rows);
  return Promise.all(rows.map((row) => validateRow(mode, row, duplicateMap)));
}

async function validateRow(
  mode: "generic" | "sanitas",
  row: SerialMigrationInputRow,
  duplicateMap: Map<string, number>,
): Promise<SerialMigrationValidationRow> {
  const warnings: string[] = [];
  const conflicts: string[] = [];
  const source = await getProduct(row.sourceProductId);
  const target = mode === "generic" ? await getProduct(row.targetId) : null;
  const sourceSerials = await getSerials(row.sourceProductId);
  const targetSerials = mode === "generic" ? await getSerials(row.targetId) : [];
  const sourceOwner = source ? await resolveOwnerForValidation(row.sourceProductId, source, "Source", conflicts) : ownerConflict("Source product does not exist.", conflicts);
  const targetOwner = target ? await resolveOwnerForValidation(row.targetId, target, "Target", conflicts) : null;

  if (!source) conflicts.push("Source product does not exist.");
  if (mode === "generic" && !target) conflicts.push("Generic target product does not exist.");
  if (mode === "generic" && row.sourceProductId === row.targetId) conflicts.push("Source and target product IDs must differ.");
  if (mode === "sanitas" && looksLikeFlexPayzProductId(row.targetId) && target) {
    conflicts.push("Sanitas mode requires an external Sanitas target ID, not an existing FlexPayz product.");
  }
  if (sourceSerials.length === 0) conflicts.push("Source has no serial.");
  if (sourceSerials.length > 1) conflicts.push("Source has multiple serials.");
  if (mode === "generic" && targetSerials.length > 0) conflicts.push("Generic target already has a serial.");
  if (mode === "generic" && targetOwner) conflicts.push("Generic target already has an owner.");
  if (mode === "generic" && target && !targetOwner && target.activated === true) conflicts.push("Generic target is activated but ownership cannot be resolved.");
  if (duplicateMap.get(`source:${row.sourceProductId}`)! > 1) conflicts.push("Source appears more than once in the file.");
  if (duplicateMap.get(`target:${row.targetId}`)! > 1) conflicts.push("Target appears more than once in the file.");

  const status = conflicts.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready";
  return {
    rowNumber: row.rowNumber,
    mode,
    sourceProductId: row.sourceProductId,
    sourceName: stringField(source?.name) || "Unknown product",
    sourceOwner,
    sourceSerial: sourceSerials.length === 1 ? sourceSerials[0] : null,
    sourceSerialCount: sourceSerials.length,
    targetId: row.targetId,
    targetProductId: mode === "generic" && target ? row.targetId : null,
    targetName: mode === "generic" ? stringField(target?.name) || "Unknown target" : row.targetId,
    targetOwner,
    targetSerialCount: targetSerials.length,
    cleanupSummary: CLEANUP_SUMMARY,
    warnings,
    conflicts,
    executable: conflicts.length === 0,
    status,
  };
}

async function getProduct(productId: string): Promise<Record<string, unknown> | null> {
  const snapshot = await db.collection(PRODUCTS).doc(productId).get();
  return snapshot.exists ? snapshot.data() || {} : null;
}

async function getSerials(productId: string): Promise<ResolvedSerial[]> {
  const snapshot = await db.collection(SERIALS).where("productID", "==", productId).get();
  return snapshot.docs.map((doc) => ({
    serialNumber: doc.id,
    productID: stringField(doc.get("productID")),
    type: stringField(doc.get("type")) || "default",
  }));
}

async function resolveOwner(productId: string, product: Record<string, unknown>): Promise<ResolvedOwner | null> {
  const ownerId = stringField(product.ownerId);
  if (ownerId) {
    const user = await db.collection(USERS).doc(ownerId).get();
    if (!user.exists) throw new Error(`Owner document ${ownerId} does not exist.`);
    const products = arrayField(user.get("products"));
    return {
      uid: ownerId,
      email: stringField(user.get("email")),
      displayName: stringField(user.get("displayName")) || stringField(user.get("name")) || "Unknown user",
      source: products.includes(productId) ? "ownerId" : "ownerId",
    };
  }

  const legacy = await db.collection(USERS).where("products", "array-contains", productId).get();
  if (legacy.docs.length > 1) throw new Error("Multiple users contain the source product.");
  if (legacy.docs.length === 1) {
    const user = legacy.docs[0];
    return {
      uid: user.id,
      email: stringField(user.get("email")),
      displayName: stringField(user.get("displayName")) || stringField(user.get("name")) || "Unknown user",
      source: "legacy-products",
    };
  }

  if (product.activated === true) throw new Error("Activated product has no resolvable owner.");
  return null;
}

async function resolveOwnerForValidation(
  productId: string,
  product: Record<string, unknown>,
  label: string,
  conflicts: string[],
) {
  try {
    return await resolveOwner(productId, product);
  } catch (error) {
    conflicts.push(`${label} ownership conflict: ${error instanceof Error ? error.message : "unresolved ownership"}`);
    return null;
  }
}

function ownerConflict(message: string, conflicts: string[]) {
  conflicts.push(message);
  return null;
}

async function executeReadyRow(operationId: string, row: SerialMigrationValidationRow): Promise<SerialMigrationResultRow> {
  const rowRef = db.collection(OPERATIONS).doc(operationId).collection("rows").doc(String(row.rowNumber));
  const existing = await rowRef.get();
  if (existing.exists && existing.get("status") === "success") {
    return existing.data() as SerialMigrationResultRow;
  }

  const sourceProductId = row.sourceProductId;
  const targetId = row.targetId;
  const serialNumber = row.sourceSerial?.serialNumber || "";
  const lockIds = [`source:${sourceProductId}`, `serial:${serialNumber}`];
  if (row.mode === "generic") lockIds.push(`target:${targetId}`);

  await acquireLocks(operationId, lockIds);
  let sourceUnlockCode = "";
  try {
    const currentRows = await validateRows(row.mode, [{
      rowNumber: row.rowNumber,
      sourceProductId: row.sourceProductId,
      targetId: row.targetId,
      original: "",
    }]);
    const currentRow = currentRows[0];
    if (!currentRow.executable) throw new Error(`Final revalidation failed: ${currentRow.conflicts.join("; ")}`);

    sourceUnlockCode = await migrateInTransaction(currentRow);
    const storageWarnings = await resetStorage(sourceProductId);
    await db.collection(PRODUCTS).doc(sourceProductId).set({
      personalContentCleanupStatus: storageWarnings.length > 0 ? "storage-warning" : "complete",
      personalContentCleanupCompletedAt: FieldValue.serverTimestamp(),
      personalContentStorageWarnings: storageWarnings,
    }, {merge: true});
    await cancelPendingTransfers(sourceProductId);

    const result: SerialMigrationResultRow = {
      rowNumber: row.rowNumber,
      mode: row.mode,
      sourceProductId,
      targetId,
      serialNumber,
      ownership: row.mode === "generic" && row.sourceOwner ? "transferred" : row.sourceOwner ? "removed" : "none",
      status: "success",
      message: row.mode === "generic" ? "Serial moved to FlexPayz target." : "Serial moved to external Sanitas target.",
      storageWarnings,
      sourceUnlockCode,
    };
    await rowRef.set({...result, completedAt: FieldValue.serverTimestamp()});
    return result;
  } finally {
    await releaseLocks(operationId, lockIds);
  }
}

async function migrateInTransaction(row: SerialMigrationValidationRow): Promise<string> {
  return db.runTransaction(async (transaction) => {
    const sourceRef = db.collection(PRODUCTS).doc(row.sourceProductId);
    const sourceSnap = await transaction.get(sourceRef);
    if (!sourceSnap.exists) throw new Error("Source product disappeared before execution.");
    const serialNumber = row.sourceSerial?.serialNumber;
    if (!serialNumber) throw new Error("Source serial missing before execution.");
    const serialRef = db.collection(SERIALS).doc(serialNumber);
    const newUnlockCode = await reserveUnlockCode(transaction, row.sourceProductId, `migration-${row.rowNumber}`);
    const updateTime = FieldValue.serverTimestamp();
    const sourceUpdate = {
      ...PERSONAL_PRODUCT_FIELD_RESET,
      ownerId: null,
      activated: false,
      serialNumber: FieldValue.delete(),
      unlockCode: newUnlockCode,
      personalContentCleanupStatus: "pending-storage-cleanup",
      personalContentCleanupStartedAt: updateTime,
      updatedAt: updateTime,
    };
    transaction.update(sourceRef, sourceUpdate);
    transaction.delete(db.collection("baby_journals").doc(row.sourceProductId));
    transaction.delete(db.collection("adult_journals").doc(row.sourceProductId));
    transaction.delete(db.collection("animal_tag").doc(row.sourceProductId));

    if (row.sourceOwner) {
      const userRef = db.collection(USERS).doc(row.sourceOwner.uid);
      const userSnap = await transaction.get(userRef);
      const currentProducts = arrayField(userSnap.get("products"));
      const nextProducts = currentProducts
        .filter((productId) => productId !== row.sourceProductId && productId !== row.targetId);
      if (row.mode === "generic") nextProducts.push(row.targetId);
      transaction.update(userRef, {products: nextProducts});
    }

    if (row.mode === "generic") {
      const targetRef = db.collection(PRODUCTS).doc(row.targetId);
      transaction.update(targetRef, {
        ownerId: row.sourceOwner?.uid || null,
        activated: Boolean(row.sourceOwner),
        serialNumber,
        updatedAt: updateTime,
      });
      transaction.update(serialRef, {
        productID: row.targetId,
        type: row.sourceSerial?.type || "default",
      });
    } else {
      transaction.update(serialRef, {
        productID: row.targetId,
        type: "sanitas-payment-ring",
      });
    }
    return newUnlockCode;
  });
}

async function reserveUnlockCode(
  transaction: FirebaseFirestore.Transaction,
  productId: string,
  requestItemId: string,
): Promise<string> {
  for (let attempt = 0; attempt < UNLOCK_CODE_RETRY_LIMIT; attempt += 1) {
    const unlockCode = generateUnlockCode();
    const reservationRef = db.collection(UNLOCK_CODES).doc(unlockCode);
    const reservation = await transaction.get(reservationRef);
    if (reservation.exists) continue;
    transaction.create(reservationRef, {
      unlockCode,
      productId,
      requestItemId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return unlockCode;
  }
  throw new Error("A unique unlock code could not be reserved after bounded retries.");
}

async function acquireLocks(operationId: string, lockIds: string[]) {
  await db.runTransaction(async (transaction) => {
    for (const lockId of lockIds) {
      const lockRef = db.collection(LOCKS).doc(lockId);
      const lock = await transaction.get(lockRef);
      if (lock.exists && lock.get("operationId") !== operationId) {
        throw new Error(`Migration lock is already held for ${lockId}.`);
      }
      transaction.set(lockRef, {
        operationId,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: ttlTimestamp(),
      }, {merge: true});
    }
  });
}

async function releaseLocks(operationId: string, lockIds: string[]) {
  await Promise.all(lockIds.map(async (lockId) => {
    const lockRef = db.collection(LOCKS).doc(lockId);
    const lock = await lockRef.get();
    if (lock.exists && lock.get("operationId") === operationId) await lockRef.delete();
  }));
}

async function cancelPendingTransfers(productId: string) {
  const transfers = await db.collection(TRANSFERS).where("productId", "==", productId).where("status", "==", "pending").get();
  await Promise.all(transfers.docs.map((doc) => doc.ref.set({
    status: "cancelled",
    cancelledAt: FieldValue.serverTimestamp(),
  }, {merge: true})));
}

async function resetStorage(productId: string): Promise<string[]> {
  const objectNames = [
    `images/${productId}`,
    `images/logo-${productId}`,
    `documents/${productId}/vCard`,
    `documents/${productId}/file1`,
    `documents/${productId}/file2`,
    `documents/${productId}/file3`,
    `documents/${productId}/CV`,
    `audio/${productId}/song1`,
    `audio/${productId}/song2`,
    `audio/${productId}/song3`,
  ];
  const prefixes = [
    `uploads/${productId}/`,
    `baby_journal/${productId}/`,
    `adult_journal/${productId}/`,
    `animal_tag/${productId}/`,
  ];
  const warnings: string[] = [];
  await Promise.all(objectNames.map(async (objectName) => {
    try {
      await bucket.file(objectName).delete({ignoreNotFound: true});
    } catch (error) {
      warnings.push(`${objectName}: ${error instanceof Error ? error.message : "delete failed"}`);
    }
  }));
  await Promise.all(prefixes.map(async (prefix) => {
    try {
      const [files] = await bucket.getFiles({prefix});
      await Promise.all(files.map(async (file) => {
        try {
          await file.delete({ignoreNotFound: true});
        } catch (error) {
          warnings.push(`${file.name}: ${error instanceof Error ? error.message : "delete failed"}`);
        }
      }));
    } catch (error) {
      warnings.push(`${prefix}: ${error instanceof Error ? error.message : "list failed"}`);
    }
  }));
  return warnings;
}

function countDuplicates(rows: SerialMigrationInputRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    addCount(counts, `source:${row.sourceProductId}`);
    addCount(counts, `target:${row.targetId}`);
  });
  return counts;
}

function addCount(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) || 0) + 1);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function arrayField(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function looksLikeFlexPayzProductId(value: string) {
  return /^[A-Za-z0-9_-]{16,}$/.test(value);
}

function ttlTimestamp() {
  return Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_DAYS * 24 * 60 * 60 * 1000);
}
