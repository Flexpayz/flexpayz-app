import {DB_COLLECTIONS} from "../../firestore/collections";
import {PRODUCT_TYPES} from "../../firestore/schema/products";
import {Preview} from "../../preview";
import {
    buildProductCreationDocuments,
    capabilitySelectionToPermissions,
    emptyProductCreationDraft,
    MAX_PRODUCT_CREATION_QUANTITY,
    normalizeProductCreationDraft,
    PRODUCT_CAPABILITIES,
    unlockCodeFromThreeBytes,
    validateProductCreationDraft,
} from "./productCreationModel";

describe("admin product creation model", () => {
    it("validates single creation and requires a capability", () => {
        const errors = validateProductCreationDraft({...emptyProductCreationDraft, mode: "single", quantity: 1});

        expect(errors).toEqual(expect.arrayContaining([
            expect.objectContaining({field: "capabilities"}),
        ]));
        expect(validateProductCreationDraft({
            ...emptyProductCreationDraft,
            mode: "single",
            quantity: 1,
            productType: PRODUCT_TYPES.FLEX_RING,
            capabilities: ["business_card"],
        })).toEqual([]);
    });

    it("validates quantity-based creation limits", () => {
        expect(validateProductCreationDraft({
            ...emptyProductCreationDraft,
            mode: "multiple",
            quantity: 0,
            capabilities: ["business_card"],
        })).toEqual(expect.arrayContaining([
            expect.objectContaining({field: "quantity", message: "Quantity must be at least 1."}),
        ]));
        expect(validateProductCreationDraft({
            ...emptyProductCreationDraft,
            mode: "multiple",
            quantity: MAX_PRODUCT_CREATION_QUANTITY + 1,
            capabilities: ["business_card"],
        })).toEqual(expect.arrayContaining([
            expect.objectContaining({field: "quantity", message: `Quantity cannot exceed ${MAX_PRODUCT_CREATION_QUANTITY}.`}),
        ]));
    });

    it("normalizes single-product quantity to one", () => {
        expect(normalizeProductCreationDraft({
            ...emptyProductCreationDraft,
            mode: "single",
            quantity: 25,
            capabilities: ["business_card"],
        }).quantity).toBe(1);
    });

    it("converts capability selections to exact permissions", () => {
        expect(capabilitySelectionToPermissions(["business_card", "animal_tag"])).toEqual({
            business_card: true,
            custom_link: false,
            upload_files: false,
            upload_video: false,
            upload_songs: false,
            baby_journal: false,
            adult_journal: false,
            animal_tag: true,
        });
    });

    it("builds modern product fields without serials or processed", () => {
        const documents = buildProductCreationDocuments({
            name: "",
            productType: PRODUCT_TYPES.PET_TAG,
            capabilities: ["animal_tag", "business_card"],
            unlockCode: "A7C9F2",
            timestamp: "server-time",
        });

        expect(documents.product).toEqual({
            name: "Pet Tag",
            productType: PRODUCT_TYPES.PET_TAG,
            administrativeStatus: "active",
            ownerId: null,
            activated: false,
            unlockCode: "A7C9F2",
            visibleSections: [Preview.BUSINESS_CARD, Preview.ANIMAL_TAG],
            preview: Preview.BUSINESS_CARD,
            createdAt: "server-time",
            updatedAt: "server-time",
        });
        expect(documents.product).not.toHaveProperty("serialNumber");
        expect(documents.product).not.toHaveProperty("processed");
        expect(documents.auxiliaryCollections).toEqual([DB_COLLECTIONS.ANIMAL_TAG]);
    });

    it("creates auxiliary documents only for selected legacy readers that need them", () => {
        const documents = buildProductCreationDocuments({
            name: "Journal set",
            productType: PRODUCT_TYPES.GENERIC,
            capabilities: ["baby_journal", "adult_journal", "upload_files"],
            unlockCode: "0000AF",
            timestamp: "server-time",
        });

        expect(documents.auxiliaryCollections).toEqual([
            DB_COLLECTIONS.BABY_JOURNALS,
            DB_COLLECTIONS.ADULT_JOURNALS,
        ]);
    });

    it("formats unlock codes from exactly three random bytes", () => {
        expect(unlockCodeFromThreeBytes(new Uint8Array([0, 175, 255]))).toBe("00AFFF");
        expect(() => unlockCodeFromThreeBytes(new Uint8Array([1, 2]))).toThrow("exactly three random bytes");
    });

    it("keeps one canonical capability list for form and factory use", () => {
        expect(PRODUCT_CAPABILITIES.map((capability) => capability.id)).toEqual([
            "business_card",
            "custom_link",
            "upload_files",
            "upload_video",
            "upload_songs",
            "baby_journal",
            "adult_journal",
            "animal_tag",
        ]);
    });
});

