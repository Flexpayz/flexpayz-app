import {z} from "zod";
import {normalizeStringArray, safeString} from "./primitives";

export const userFirestoreSchema = z.object({
    country: z.string().optional().nullable(),
    products: z.array(z.unknown()).optional().nullable(),
}).passthrough();

export type UserFirestoreData = z.infer<typeof userFirestoreSchema>;

export interface UserProfile {
    country: string;
    products: string[];
}

export type UserCreateInput = UserProfile;
export type UserUpdateInput = Partial<UserProfile>;

export function normalizeUserProfile(raw: unknown): UserProfile {
    const parsed = userFirestoreSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : {};
    return {
        country: safeString(data.country),
        products: normalizeStringArray(data.products),
    };
}
