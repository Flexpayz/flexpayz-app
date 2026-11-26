import {Preview} from "./preview";
import {defaultPermissions} from "./permissions";
import {
    buildVisibleSectionsWrite,
    getPublicRoutingMode,
    getVisibleSections,
    sanitizeVisibleSections,
} from "./product-visibility";

describe("product visibility compatibility", () => {
    it("derives one visible section from legacy preview", () => {
        expect(getVisibleSections({preview: Preview.CUSTOM_LINK})).toEqual([Preview.CUSTOM_LINK]);
        expect(getPublicRoutingMode([Preview.CUSTOM_LINK])).toBe('single');
    });

    it("keeps explicit empty visibleSections empty", () => {
        expect(getVisibleSections({preview: Preview.BUSINESS_CARD, visibleSections: []})).toEqual([]);
        expect(getPublicRoutingMode([])).toBe('empty');
    });

    it("uses visibleSections before legacy preview", () => {
        expect(getVisibleSections({
            preview: Preview.BUSINESS_CARD,
            visibleSections: [Preview.UPLOAD_FILE, Preview.CUSTOM_LINK],
        })).toEqual([Preview.CUSTOM_LINK, Preview.UPLOAD_FILE]);
    });

    it("removes duplicates and unpermitted sections while preserving fixed order", () => {
        expect(sanitizeVisibleSections(
            [Preview.UPLOAD_FILE, Preview.BUSINESS_CARD, Preview.UPLOAD_FILE, Preview.ANIMAL_TAG],
            {...defaultPermissions, upload_files: false}
        )).toEqual([Preview.BUSINESS_CARD, Preview.ANIMAL_TAG]);
    });

    it("writes visibleSections and syncs legacy preview only for non-empty selections", () => {
        expect(buildVisibleSectionsWrite([Preview.UPLOAD_FILE, Preview.BUSINESS_CARD], defaultPermissions)).toEqual({
            visibleSections: [Preview.BUSINESS_CARD, Preview.UPLOAD_FILE],
            preview: Preview.BUSINESS_CARD,
        });
        expect(buildVisibleSectionsWrite([], defaultPermissions)).toEqual({visibleSections: []});
    });
});
