import {z} from "zod";
import type {UpdateData} from "firebase/firestore";

export type FirestoreValidationIssue = {
    collectionPath: string;
    documentId: string;
    issues: string[];
};

export type FirestoreDocument<T> = {
    id: string;
    data: T;
};

export type FirestoreTimestampLike = {
    seconds: number;
    nanoseconds: number;
    toDate?: () => Date;
};

export const firestoreTimestampLikeSchema = z.object({
    seconds: z.number().optional(),
    nanoseconds: z.number().optional(),
    toDate: z.function().args().returns(z.date()).optional(),
}).passthrough();

export const dateLikeSchema = z.union([
    z.date(),
    z.string(),
    z.number(),
    firestoreTimestampLikeSchema,
]);

export const assetSchema = z.object({
    name: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
}).passthrough();

export type FirestoreAsset = z.infer<typeof assetSchema>;

export function safeString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function safeBoolean(value: unknown): boolean {
    return value === true;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeAssets(value: unknown): {name: string; url: string}[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((asset, index) => {
            const parsed = assetSchema.safeParse(asset);
            if (!parsed.success) return null;
            const url = safeString(parsed.data.url) || safeString(parsed.data.source);
            if (!url) return null;
            return {
                url,
                name: safeString(parsed.data.name) || `Uploaded file ${index + 1}`,
            };
        })
        .filter((asset): asset is {name: string; url: string} => Boolean(asset));
}

export function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}

export function normalizeDateLike(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (isRecord(value) && typeof value.toDate === "function") {
        try {
            const parsed = value.toDate();
            return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
}

export function stripUndefined<T extends object>(value: T): Partial<T> {
    return Object.entries(value).reduce<Partial<T>>((clean, [key, entry]) => {
        if (entry !== undefined) {
            clean[key as keyof T] = entry as T[keyof T];
        }
        return clean;
    }, {});
}

export function toFirestoreUpdate<T extends object>(value: object): UpdateData<T> {
    return stripUndefined(value) as UpdateData<T>;
}

export function parseFirestoreData<T>(
    collectionPath: string,
    documentId: string,
    schema: z.ZodType<T>,
    value: unknown,
): T | null {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;

    logFirestoreValidationIssue({
        collectionPath,
        documentId,
        issues: parsed.error.issues.map((issue) => issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message),
    });
    return null;
}

export function logFirestoreValidationIssue(issue: FirestoreValidationIssue) {
    console.warn("Firestore validation issue", {
        collectionPath: issue.collectionPath,
        documentId: issue.documentId,
        issues: issue.issues,
    });
}
