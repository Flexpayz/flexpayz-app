import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {db} from "./firebaseAdmin";
import {
  IDEMPOTENCY_TTL_DAYS,
  MAX_PRODUCT_CREATION_QUANTITY,
  UNLOCK_CODE_RETRY_LIMIT,
} from "./config";
import {
  CapabilityId,
  ProductCreationRequest,
  ProductCreationResponse,
  ProductCreationResultItem,
  capabilitySelectionToPermissions,
  capabilitySelectionToVisibleSections,
  createRequestHash,
  generateUnlockCode,
  getProductName,
  normalizeCreationRequest,
  requiredAuxiliaryCollections,
} from "./productCreationModel";

const PRODUCTS = "products";
const PERMISSIONS = "permissions";
const REQUESTS = "_internal_admin_product_creation_requests";
const UNLOCK_CODES = "_internal_unlock_code_reservations";

export const createAdminProducts = onCall(async (request): Promise<ProductCreationResponse> => {
  assertSystemAdmin(request.auth?.token);

  const creationRequest = parseRequest(request.data);
  const requestHash = createRequestHash(creationRequest);
  await ensureRequestRecord(creationRequest, requestHash, String(request.auth?.uid || "unknown"));

  const results: ProductCreationResultItem[] = [];
  for (let index = 0; index < creationRequest.quantity; index += 1) {
    const requestItemId = `${creationRequest.requestId}-${index + 1}`;
    try {
      results.push(await createOneProduct(creationRequest, requestHash, requestItemId, index));
    } catch (error) {
      logger.error("Product creation item failed", {requestItemId, error});
      results.push(await recordItemFailure(creationRequest, requestHash, requestItemId, error));
    }
  }

  await db.collection(REQUESTS).doc(creationRequest.requestId).set({
    status: results.some((result) => result.status === "failed") ? "partial" : "complete",
    completedAt: FieldValue.serverTimestamp(),
    successCount: results.filter((result) => result.status === "created").length,
    failureCount: results.filter((result) => result.status === "failed").length,
  }, {merge: true});

  return {
    requestId: creationRequest.requestId,
    results,
  };
});

function assertSystemAdmin(token: Record<string, unknown> | undefined) {
  if (!token) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (token.role !== "system-admin") {
    throw new HttpsError("permission-denied", "System admin role is required.");
  }
}

function parseRequest(data: unknown): ProductCreationRequest {
  try {
    return normalizeCreationRequest(data, MAX_PRODUCT_CREATION_QUANTITY);
  } catch (error) {
    throw new HttpsError("invalid-argument", error instanceof Error ? error.message : "Invalid creation request.");
  }
}

async function ensureRequestRecord(request: ProductCreationRequest, requestHash: string, actorUid: string) {
  const requestRef = db.collection(REQUESTS).doc(request.requestId);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(requestRef);
    if (existing.exists) {
      if (existing.get("requestHash") !== requestHash) {
        throw new HttpsError("already-exists", "Request ID was already used for different creation settings.");
      }
      return;
    }

    transaction.create(requestRef, {
      requestHash,
      actorUid,
      status: "running",
      mode: request.mode,
      productType: request.productType,
      quantity: request.quantity,
      name: request.name || null,
      capabilities: request.capabilities,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: ttlTimestamp(),
    });
  });
}

async function createOneProduct(
  request: ProductCreationRequest,
  requestHash: string,
  requestItemId: string,
  index: number,
): Promise<ProductCreationResultItem> {
  const itemRef = db.collection(REQUESTS).doc(request.requestId).collection("items").doc(requestItemId);
  const existingItem = await itemRef.get();
  if (existingItem.exists) {
    const existing = existingItem.data() as ProductCreationResultItem & {requestHash?: string};
    if (existing.requestHash !== requestHash) {
      throw new HttpsError("already-exists", "Request item ID was already used for different creation settings.");
    }
    return toResultItem(existing);
  }

  const productRef = db.collection(PRODUCTS).doc();
  const createdAtIso = new Date().toISOString();
  const productName = getProductName(request.productType, request.name);
  const visibleSections = capabilitySelectionToVisibleSections(request.capabilities);
  const permissions = capabilitySelectionToPermissions(request.capabilities);
  const auxiliaryCollections = requiredAuxiliaryCollections(request.capabilities);

  return db.runTransaction(async (transaction) => {
    const duplicateItem = await transaction.get(itemRef);
    if (duplicateItem.exists) {
      const existing = duplicateItem.data() as ProductCreationResultItem & {requestHash?: string};
      return toResultItem(existing);
    }

    const unlockCode = await reserveUnlockCode(transaction, productRef.id, requestItemId);
    const productData = {
      name: productName,
      productType: request.productType,
      administrativeStatus: "active",
      ownerId: null,
      activated: false,
      unlockCode,
      visibleSections,
      preview: visibleSections[0],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.create(productRef, productData);
    transaction.create(db.collection(PERMISSIONS).doc(productRef.id), permissions);
    auxiliaryCollections.forEach((collectionName) => {
      transaction.create(db.collection(collectionName).doc(productRef.id), {});
    });

    const result: ProductCreationResultItem & {requestHash: string; createdOrder: number} = {
      requestItemId,
      requestHash,
      status: "created",
      productId: productRef.id,
      unlockCode,
      productType: request.productType,
      name: productName,
      capabilities: request.capabilities,
      createdAt: createdAtIso,
      createdOrder: index,
    };

    transaction.create(itemRef, {
      ...result,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso,
      expiresAt: ttlTimestamp(),
    });

    return toResultItem(result);
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

async function recordItemFailure(
  request: ProductCreationRequest,
  requestHash: string,
  requestItemId: string,
  error: unknown,
): Promise<ProductCreationResultItem> {
  const itemRef = db.collection(REQUESTS).doc(request.requestId).collection("items").doc(requestItemId);
  const existingItem = await itemRef.get();
  if (existingItem.exists) {
    return toResultItem(existingItem.data() as ProductCreationResultItem);
  }

  const failed: ProductCreationResultItem & {requestHash: string} = {
    requestItemId,
    requestHash,
    status: "failed",
    productType: request.productType,
    name: getProductName(request.productType, request.name),
    capabilities: request.capabilities,
    error: error instanceof HttpsError ? error.message : error instanceof Error ? error.message : "Product creation failed.",
    createdAt: new Date().toISOString(),
  };
  await itemRef.create({
    ...failed,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: failed.createdAt,
    expiresAt: ttlTimestamp(),
  });
  return toResultItem(failed);
}

function toResultItem(data: ProductCreationResultItem & {
  createdAtIso?: string;
  requestHash?: string;
  createdOrder?: number;
}): ProductCreationResultItem {
  const result: ProductCreationResultItem = {
    requestItemId: data.requestItemId,
    status: data.status,
    productType: data.productType,
    name: data.name,
    capabilities: data.capabilities as CapabilityId[],
  };
  if (data.productId) result.productId = data.productId;
  if (data.unlockCode) result.unlockCode = data.unlockCode;
  if (data.error) result.error = data.error;
  if (data.createdAtIso || data.createdAt) result.createdAt = String(data.createdAtIso || data.createdAt);
  return result;
}

function ttlTimestamp() {
  return Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_DAYS * 24 * 60 * 60 * 1000);
}
