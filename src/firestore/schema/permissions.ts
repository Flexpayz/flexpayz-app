import {z} from "zod";
import {safeBoolean} from "./primitives";

export const permissionsFirestoreSchema = z.object({
    business_card: z.boolean().optional().nullable(),
    custom_link: z.boolean().optional().nullable(),
    upload_files: z.boolean().optional().nullable(),
    upload_video: z.boolean().optional().nullable(),
    upload_songs: z.boolean().optional().nullable(),
    baby_journal: z.boolean().optional().nullable(),
    adult_journal: z.boolean().optional().nullable(),
    animal_tag: z.boolean().optional().nullable(),
}).passthrough();

export interface Permissions {
    business_card: boolean;
    custom_link: boolean;
    upload_files: boolean;
    upload_video: boolean;
    upload_songs: boolean;
    baby_journal: boolean;
    adult_journal: boolean;
    animal_tag: boolean;
}

export type PermissionsFirestoreData = z.infer<typeof permissionsFirestoreSchema>;
export type PermissionsCreateInput = Permissions;
export type PermissionsUpdateInput = Partial<Permissions>;

export const defaultPermissions: Permissions = {
    business_card: true,
    custom_link: true,
    upload_files: true,
    upload_video: true,
    upload_songs: true,
    baby_journal: true,
    adult_journal: true,
    animal_tag: true,
};

export function normalizePermissions(raw: unknown): Permissions {
    const parsed = permissionsFirestoreSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : {};
    return {
        business_card: data.business_card === undefined || data.business_card === null ? defaultPermissions.business_card : safeBoolean(data.business_card),
        custom_link: data.custom_link === undefined || data.custom_link === null ? defaultPermissions.custom_link : safeBoolean(data.custom_link),
        upload_files: data.upload_files === undefined || data.upload_files === null ? defaultPermissions.upload_files : safeBoolean(data.upload_files),
        upload_video: data.upload_video === undefined || data.upload_video === null ? defaultPermissions.upload_video : safeBoolean(data.upload_video),
        upload_songs: data.upload_songs === undefined || data.upload_songs === null ? defaultPermissions.upload_songs : safeBoolean(data.upload_songs),
        baby_journal: data.baby_journal === undefined || data.baby_journal === null ? defaultPermissions.baby_journal : safeBoolean(data.baby_journal),
        adult_journal: data.adult_journal === undefined || data.adult_journal === null ? defaultPermissions.adult_journal : safeBoolean(data.adult_journal),
        animal_tag: data.animal_tag === undefined || data.animal_tag === null ? defaultPermissions.animal_tag : safeBoolean(data.animal_tag),
    };
}
