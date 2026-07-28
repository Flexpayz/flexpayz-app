export interface Permissions {
    business_card: boolean,
    custom_link: boolean,
    upload_files: boolean,
    upload_video: boolean,
    upload_songs: boolean,
    baby_journal: boolean,
    adult_journal: boolean,
    animal_tag: boolean,
}

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
