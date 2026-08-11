import {createHash, randomBytes} from "crypto";

export type SerialMigrationMode = "generic" | "sanitas";
export type SerialMigrationStatus = "ready" | "warning" | "blocked";
export type SerialMigrationResultStatus = "success" | "failed" | "skipped";

export interface SerialMigrationInputRow {
  rowNumber: number;
  sourceProductId: string;
  targetId: string;
  original: string;
}

export interface SerialMigrationDryRunRequest {
  operationId: string;
  mode: SerialMigrationMode;
  rows: SerialMigrationInputRow[];
}

export interface SerialMigrationExecuteRequest extends SerialMigrationDryRunRequest {
  validationToken: string;
  reason: string;
  confirmationPhrase: string;
  acknowledgedPermanentDeletion: boolean;
  inputChecksum?: string;
}

export interface ResolvedOwner {
  uid: string;
  email: string;
  displayName: string;
  source: "ownerId" | "legacy-products";
}

export interface ResolvedSerial {
  serialNumber: string;
  productID: string;
  type: string;
}

export interface SerialMigrationValidationRow {
  rowNumber: number;
  mode: SerialMigrationMode;
  sourceProductId: string;
  sourceName: string;
  sourceOwner: ResolvedOwner | null;
  sourceSerial: ResolvedSerial | null;
  sourceSerialCount: number;
  targetId: string;
  targetProductId: string | null;
  targetName: string;
  targetOwner: ResolvedOwner | null;
  targetSerialCount: number;
  cleanupSummary: string[];
  warnings: string[];
  conflicts: string[];
  executable: boolean;
  status: SerialMigrationStatus;
}

export interface SerialMigrationDryRunResponse {
  operationId: string;
  mode: SerialMigrationMode;
  validationToken: string;
  rows: SerialMigrationValidationRow[];
  summary: SerialMigrationSummary;
}

export interface SerialMigrationSummary {
  total: number;
  ready: number;
  blocked: number;
  warnings: number;
  ownedSources: number;
  unownedSources: number;
}

export interface SerialMigrationResultRow {
  rowNumber: number;
  mode: SerialMigrationMode;
  sourceProductId: string;
  targetId: string;
  serialNumber: string;
  ownership: "transferred" | "removed" | "none";
  status: SerialMigrationResultStatus;
  message: string;
  storageWarnings: string[];
  sourceUnlockCode?: string;
}

export interface SerialMigrationExecuteResponse {
  operationId: string;
  mode: SerialMigrationMode;
  results: SerialMigrationResultRow[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    storageWarnings: number;
    durationMs: number;
  };
}

export const CLEANUP_SUMMARY = [
  "Personal product fields reset",
  "Selected public content reset to safe default",
  "Baby journal, adult journal and animal-tag documents deleted",
  "Images, logos, documents, audio files, legacy uploads, journals and animal-tag media removed from Storage",
  "Pending transfer records for the source product cancelled where present",
];

export const PERSONAL_PRODUCT_FIELD_RESET: Record<string, unknown> = {
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  email2: "",
  email3: "",
  phoneNumber: "",
  phoneNumber2: "",
  phoneNumber3: "",
  country: "",
  address: "",
  address2: "",
  zipCode: "",
  city: "",
  linkedIn: "",
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  about: "",
  companyName: "",
  companyRegNumber: "",
  companyAddress: "",
  companyCity: "",
  companyCountry: "",
  companyPhoneNumber: "",
  companyAbout: "",
  customLink: "",
  filename1: "",
  filename2: "",
  filename3: "",
  cv: false,
  website: "",
  website2: "",
  youtubeLink: "",
  publicPagePassword: "",
  publicPagePasswordActivated: false,
  logo: "",
  song1: "",
  song2: "",
  song3: "",
  businessFile: "",
  sharedContacts: [],
  visibleSections: [],
  preview: "business_card",
};

export function normalizeDryRunRequest(data: unknown): SerialMigrationDryRunRequest {
  const raw = objectData(data);
  rejectUnknownFields(raw, ["operationId", "mode", "rows"]);
  const operationId = requiredString(raw.operationId, "operationId", 120);
  const mode = normalizeMode(raw.mode);
  const rows = normalizeRows(raw.rows);
  return {operationId, mode, rows};
}

export function normalizeExecuteRequest(data: unknown): SerialMigrationExecuteRequest {
  const raw = objectData(data);
  rejectUnknownFields(raw, [
    "operationId",
    "mode",
    "rows",
    "validationToken",
    "reason",
    "confirmationPhrase",
    "acknowledgedPermanentDeletion",
    "inputChecksum",
  ]);
  const base = normalizeDryRunRequest({
    operationId: raw.operationId,
    mode: raw.mode,
    rows: raw.rows,
  });
  return {
    ...base,
    validationToken: requiredString(raw.validationToken, "validationToken", 200),
    reason: requiredString(raw.reason, "reason", 500),
    confirmationPhrase: requiredString(raw.confirmationPhrase, "confirmationPhrase", 120),
    acknowledgedPermanentDeletion: raw.acknowledgedPermanentDeletion === true,
    inputChecksum: typeof raw.inputChecksum === "string" ? raw.inputChecksum : undefined,
  };
}

export function validationTokenFor(rows: SerialMigrationValidationRow[]) {
  return createHash("sha256")
    .update(JSON.stringify(rows.map((row) => ({
      rowNumber: row.rowNumber,
      mode: row.mode,
      sourceProductId: row.sourceProductId,
      sourceSerial: row.sourceSerial?.serialNumber || "",
      sourceSerialCount: row.sourceSerialCount,
      sourceOwner: row.sourceOwner?.uid || "",
      targetId: row.targetId,
      targetOwner: row.targetOwner?.uid || "",
      targetSerialCount: row.targetSerialCount,
      executable: row.executable,
      conflicts: row.conflicts,
    }))))
    .digest("hex");
}

export function summarizeValidation(rows: SerialMigrationValidationRow[]): SerialMigrationSummary {
  return {
    total: rows.length,
    ready: rows.filter((row) => row.executable).length,
    blocked: rows.filter((row) => row.status === "blocked").length,
    warnings: rows.filter((row) => row.warnings.length > 0).length,
    ownedSources: rows.filter((row) => row.sourceOwner).length,
    unownedSources: rows.filter((row) => row.sourceProductId && !row.sourceOwner).length,
  };
}

export function generateUnlockCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function createInputChecksum(rows: SerialMigrationInputRow[]) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function objectData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Request body must be an object.");
  }
  return data as Record<string, unknown>;
}

function normalizeMode(value: unknown): SerialMigrationMode {
  if (value === "generic" || value === "sanitas") return value;
  throw new Error("Unsupported migration mode.");
}

function normalizeRows(value: unknown): SerialMigrationInputRow[] {
  if (!Array.isArray(value)) throw new Error("Rows must be an array.");
  if (value.length === 0) throw new Error("At least one row is required.");
  if (value.length > 500) throw new Error("A migration file cannot contain more than 500 rows.");
  return value.map((row, index) => {
    const raw = objectData(row);
    rejectUnknownFields(raw, ["rowNumber", "sourceProductId", "targetId", "original"]);
    return {
      rowNumber: numberValue(raw.rowNumber, index + 1),
      sourceProductId: requiredString(raw.sourceProductId, "sourceProductId", 180),
      targetId: requiredString(raw.targetId, "targetId", 220),
      original: typeof raw.original === "string" ? raw.original.slice(0, 1000) : "",
    };
  });
}

function rejectUnknownFields(data: Record<string, unknown>, allowed: string[]) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(data).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) throw new Error(`Unknown request field: ${unknown[0]}.`);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} is required.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} is too long.`);
  return trimmed;
}

function numberValue(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
