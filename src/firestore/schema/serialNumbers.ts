import {z} from "zod";
import {dateLikeSchema, normalizeDateLike, safeString, stripUndefined} from "./primitives";

export const serialNumberTypeSchema = z.union([
    z.literal("default"),
    z.literal("sanitas-payment-ring"),
]);

export type SerialNumberType = z.infer<typeof serialNumberTypeSchema>;

export const serialNumberFirestoreSchema = z.object({
    productID: z.string().optional().nullable(),
    type: serialNumberTypeSchema.optional().nullable(),
    redirectUrl: z.string().optional().nullable(),
    createdAt: dateLikeSchema.optional().nullable(),
}).passthrough();

export type SerialNumberFirestoreData = z.infer<typeof serialNumberFirestoreSchema>;

export interface SerialNumberRecord {
    productID: string;
    type: SerialNumberType;
    redirectUrl?: string;
    createdAt: Date | null;
}

export type SerialNumberCreateInput = {
    productID: string;
    type: SerialNumberType;
    redirectUrl?: string;
    createdAt?: unknown;
};

export type SerialNumberUpdateInput = Partial<Pick<SerialNumberRecord, "productID" | "type" | "redirectUrl">>;

export function normalizeSerialNumber(raw: unknown): SerialNumberRecord {
    const parsed = serialNumberFirestoreSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : {};
    const redirectUrl = safeString(data.redirectUrl);
    return stripUndefined({
        productID: safeString(data.productID),
        type: data.type || "default",
        redirectUrl: redirectUrl || undefined,
        createdAt: normalizeDateLike(data.createdAt),
    }) as SerialNumberRecord;
}
