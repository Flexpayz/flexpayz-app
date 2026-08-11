import {z} from "zod";
import {safeString} from "./primitives";

export const mailMessageSchema = z.object({
    subject: z.string(),
    text: z.string(),
});

export const mailFirestoreSchema = z.object({
    productId: z.string(),
    to: z.string(),
    message: mailMessageSchema,
}).passthrough();

export type MailFirestoreData = z.infer<typeof mailFirestoreSchema>;
export type MailCreateInput = MailFirestoreData;

export function normalizeMail(raw: unknown): MailFirestoreData {
    const parsed = mailFirestoreSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    const record = raw && typeof raw === "object" ? raw as {productId?: unknown; to?: unknown; message?: {subject?: unknown; text?: unknown}} : {};
    return {
        productId: safeString(record.productId),
        to: safeString(record.to),
        message: {
            subject: safeString(record.message?.subject),
            text: safeString(record.message?.text),
        },
    };
}
