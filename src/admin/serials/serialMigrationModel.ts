import Papa from "papaparse";

export type SerialMigrationMode = "generic" | "sanitas";
export type SerialMigrationStatus = "ready" | "warning" | "blocked";
export type SerialMigrationResultStatus = "success" | "failed" | "skipped";

export interface SerialMigrationInputRow {
    rowNumber: number;
    sourceProductId: string;
    targetId: string;
    original: string;
}

export interface SerialMigrationParseResult {
    rows: SerialMigrationInputRow[];
    errors: string[];
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

export interface SerialMigrationSummary {
    total: number;
    ready: number;
    blocked: number;
    warnings: number;
    ownedSources: number;
    unownedSources: number;
}

export interface SerialMigrationDryRunResponse {
    operationId: string;
    mode: SerialMigrationMode;
    validationToken: string;
    rows: SerialMigrationValidationRow[];
    summary: SerialMigrationSummary;
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

export function parseSerialMigrationText(text: string): SerialMigrationParseResult {
    const cleanText = text.replace(/^\uFEFF/, "");
    const parsed = Papa.parse<Record<string, string>>(cleanText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    if (parsed.meta.fields?.includes("oldProductId")) {
        const rows = parsed.data.map((row, index) => toInputRow(index + 2, row.oldProductId || "", row.newProductId || "", JSON.stringify(row)));
        return {
            rows,
            errors: [
                ...parsed.errors.map((error) => `Row ${error.row || "?"}: ${error.message}`),
                ...validateParsedRows(rows),
            ],
        };
    }

    const legacy = Papa.parse<string[]>(cleanText, {
        header: false,
        skipEmptyLines: true,
    });
    const rows = legacy.data.map((row, index) => toInputRow(index + 1, row[0] || "", row[1] || "", row.join(",")));
    return {
        rows,
        errors: [
            ...legacy.errors.map((error) => `Row ${error.row || "?"}: ${error.message}`),
            ...validateParsedRows(rows),
        ],
    };
}

export function extractProductId(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
        const url = new URL(trimmed);
        return url.searchParams.get("product_id")?.trim() || trimmed;
    } catch {
        const match = trimmed.match(/[?&]product_id=([^&#]+)/);
        return match?.[1]?.trim() || trimmed;
    }
}

export function createOperationId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createInputChecksum(rows: SerialMigrationInputRow[]) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(rows)))).slice(0, 120);
}

export function validationErrorRows(rows: SerialMigrationValidationRow[]) {
    return rows.filter((row) => row.status === "blocked");
}

export function resultFailureRows(rows: SerialMigrationResultRow[]) {
    return rows.filter((row) => row.status !== "success");
}

export function getTemplate(mode: SerialMigrationMode) {
    if (mode === "generic") {
        return "oldProductId,newProductId\nhttps://flexpayz.com/app?product_id=OLD_PRODUCT_ID,TARGET_FLEXPAYZ_PRODUCT_ID\n";
    }
    return "oldProductId,newProductId\nhttps://flexpayz.com/app?product_id=OLD_PRODUCT_ID,EXTERNAL_SANITAS_PRODUCT_ID\n";
}

function toInputRow(rowNumber: number, oldProductId: string, targetId: string, original: string): SerialMigrationInputRow {
    return {
        rowNumber,
        sourceProductId: extractProductId(oldProductId),
        targetId: targetId.trim(),
        original,
    };
}

function validateParsedRows(rows: SerialMigrationInputRow[]) {
    const errors: string[] = [];
    const sourceCounts = new Map<string, number>();
    const targetCounts = new Map<string, number>();

    rows.forEach((row) => {
        if (row.sourceProductId) sourceCounts.set(row.sourceProductId, (sourceCounts.get(row.sourceProductId) || 0) + 1);
        if (row.targetId) targetCounts.set(row.targetId, (targetCounts.get(row.targetId) || 0) + 1);
    });

    rows.forEach((row) => {
        if (!row.sourceProductId) errors.push(`Row ${row.rowNumber}: missing source product ID.`);
        if (!row.targetId) errors.push(`Row ${row.rowNumber}: missing target ID.`);
        if (row.sourceProductId.startsWith("http://") || row.sourceProductId.startsWith("https://")) {
            errors.push(`Row ${row.rowNumber}: source URL must include a product_id parameter.`);
        }
        if (row.sourceProductId && /[\s,]/.test(row.sourceProductId)) errors.push(`Row ${row.rowNumber}: invalid source product ID.`);
        if (row.sourceProductId && sourceCounts.get(row.sourceProductId)! > 1) errors.push(`Row ${row.rowNumber}: duplicate source product ID.`);
        if (row.targetId && targetCounts.get(row.targetId)! > 1) errors.push(`Row ${row.rowNumber}: duplicate target ID.`);
    });
    return errors;
}
