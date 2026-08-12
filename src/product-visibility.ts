import {Preview} from "./preview";
import {Permissions} from "./permissions";

export type PublicRoutingMode = 'empty' | 'single' | 'dashboard';

export type PublicSectionDefinition = {
    id: Preview;
    permission: keyof Permissions;
    group: 'professional' | 'personal';
    title: string;
    shortTitle: string;
    description: string;
    route: string;
    iconLabel: string;
};

export type ProductVisibilityLike = {
    preview?: Preview;
    visibleSections?: Preview[];
};

export const PUBLIC_SECTION_ORDER: PublicSectionDefinition[] = [
    {
        id: Preview.BUSINESS_CARD,
        permission: 'business_card',
        group: 'professional',
        title: 'Business Card',
        shortTitle: 'Business Card',
        description: 'Contact profile and social links',
        route: 'business-card',
        iconLabel: 'BC',
    },
    {
        id: Preview.CUSTOM_LINK,
        permission: 'custom_link',
        group: 'professional',
        title: 'Custom Link',
        shortTitle: 'Custom Link',
        description: 'Redirect to an external URL',
        route: 'custom-link',
        iconLabel: '↗',
    },
    {
        id: Preview.UPLOAD_FILE,
        permission: 'upload_files',
        group: 'professional',
        title: 'Upload Files',
        shortTitle: 'Upload Files',
        description: 'Share up to three PDF documents',
        route: 'upload-files',
        iconLabel: 'PDF',
    },
    {
        id: Preview.UPLOAD_VIDEO,
        permission: 'upload_video',
        group: 'professional',
        title: 'Upload Video',
        shortTitle: 'Upload Video',
        description: 'Play a YouTube video',
        route: 'upload-video',
        iconLabel: '▶',
    },
    {
        id: Preview.UPLOAD_SONGS,
        permission: 'upload_songs',
        group: 'professional',
        title: 'Upload Songs',
        shortTitle: 'Upload Songs',
        description: 'Share up to three audio tracks',
        route: 'upload-songs',
        iconLabel: '♫',
    },
    {
        id: Preview.BABY_JOURNAL,
        permission: 'baby_journal',
        group: 'personal',
        title: 'Baby Journal',
        shortTitle: 'Baby Journal',
        description: 'Private memory journal',
        route: 'baby-journal',
        iconLabel: 'B',
    },
    {
        id: Preview.ADULT_JOURNAL,
        permission: 'adult_journal',
        group: 'personal',
        title: 'Adult Journal',
        shortTitle: 'Adult Journal',
        description: 'Personal journal experience',
        route: 'adult-journal',
        iconLabel: 'J',
    },
    {
        id: Preview.ANIMAL_TAG,
        permission: 'animal_tag',
        group: 'personal',
        title: 'Animal Tag',
        shortTitle: 'Animal Tag',
        description: 'Pet identification profile',
        route: 'animal-tag',
        iconLabel: 'P',
    },
];

export const PUBLIC_SECTION_IDS = PUBLIC_SECTION_ORDER.map((section) => section.id);

export function hasExplicitVisibleSections(product: ProductVisibilityLike) {
    return Array.isArray(product.visibleSections);
}

export function getSectionById(id: Preview) {
    return PUBLIC_SECTION_ORDER.find((section) => section.id === id);
}

export function getPermittedSections(permissions: Permissions) {
    return PUBLIC_SECTION_ORDER.filter((section) => permissions[section.permission]);
}

export function sanitizeVisibleSections(sections: unknown, permissions?: Permissions) {
    const selected = Array.isArray(sections) ? sections : [];
    const permittedIds = new Set(
        PUBLIC_SECTION_ORDER
            .filter((section) => !permissions || permissions[section.permission])
            .map((section) => section.id)
    );
    const selectedIds = new Set(selected.filter((section): section is Preview => PUBLIC_SECTION_IDS.includes(section as Preview)));

    return PUBLIC_SECTION_ORDER
        .map((section) => section.id)
        .filter((section) => selectedIds.has(section) && permittedIds.has(section));
}

export function getVisibleSections(product: ProductVisibilityLike, permissions?: Permissions) {
    if (hasExplicitVisibleSections(product)) {
        return sanitizeVisibleSections(product.visibleSections, permissions);
    }

    if (product.preview && PUBLIC_SECTION_IDS.includes(product.preview)) {
        return sanitizeVisibleSections([product.preview], permissions);
    }

    return [];
}

export function getPublicRoutingMode(visibleSections: Preview[]): PublicRoutingMode {
    if (visibleSections.length === 0) return 'empty';
    if (visibleSections.length === 1) return 'single';
    return 'dashboard';
}

export function buildVisibleSectionsWrite(visibleSections: Preview[], permissions: Permissions) {
    const sanitized = sanitizeVisibleSections(visibleSections, permissions);
    return sanitized.length > 0
        ? {visibleSections: sanitized, preview: sanitized[0]}
        : {visibleSections: sanitized};
}

export function getRoutingSummary(visibleSections: Preview[]) {
    if (visibleSections.length === 0) {
        return 'No sections selected — visitors see the setup-required state';
    }
    if (visibleSections.length === 1) {
        return '1 section selected — opens directly';
    }
    return `${visibleSections.length} sections selected — opens the intermediary dashboard`;
}
