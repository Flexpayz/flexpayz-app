import {DB_COLLECTIONS} from "../../firestore/collections";
import type {Permissions} from "../../firestore/schema/permissions";
import type {ProductFirestoreData, ProductType} from "../../firestore/schema/products";
import {PRODUCT_TYPES} from "../../firestore/schema/products";
import {Preview} from "../../preview";

export const MAX_PRODUCT_CREATION_QUANTITY = 500;
export const ADMIN_CREATE_PRODUCTS_FUNCTION = "createAdminProducts";

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
    [PRODUCT_TYPES.FLEX_RING]: "Flex Ring",
    [PRODUCT_TYPES.FLEX_CARD]: "Flex Card",
    [PRODUCT_TYPES.FLEX_BRACELET]: "Flex Bracelet",
    [PRODUCT_TYPES.PET_TAG]: "Pet Tag",
    [PRODUCT_TYPES.GENERIC]: "Generic/Unknown Product",
};

export type ProductCreationMode = "single" | "multiple";
export type CapabilityId = keyof Permissions;

export interface ProductCapabilityDefinition {
    id: CapabilityId;
    preview: Preview;
    label: string;
    description: string;
    auxiliaryCollections: DB_COLLECTIONS[];
}

export const PRODUCT_CAPABILITIES: ProductCapabilityDefinition[] = [
    {
        id: "business_card",
        preview: Preview.BUSINESS_CARD,
        label: "Business card",
        description: "Public contact profile with links, company details and downloadable vCard support.",
        auxiliaryCollections: [],
    },
    {
        id: "custom_link",
        preview: Preview.CUSTOM_LINK,
        label: "Custom link",
        description: "A single public redirect-style link configured later by the product owner.",
        auxiliaryCollections: [],
    },
    {
        id: "upload_files",
        preview: Preview.UPLOAD_FILE,
        label: "Upload files",
        description: "Document and file-sharing section for owner-managed files.",
        auxiliaryCollections: [],
    },
    {
        id: "upload_video",
        preview: Preview.UPLOAD_VIDEO,
        label: "Upload video",
        description: "Video content section using the existing public video experience.",
        auxiliaryCollections: [],
    },
    {
        id: "upload_songs",
        preview: Preview.UPLOAD_SONGS,
        label: "Upload songs",
        description: "Audio content section for owner-managed songs.",
        auxiliaryCollections: [],
    },
    {
        id: "baby_journal",
        preview: Preview.BABY_JOURNAL,
        label: "Baby journal",
        description: "Journal section backed by an empty baby-journal document.",
        auxiliaryCollections: [DB_COLLECTIONS.BABY_JOURNALS],
    },
    {
        id: "adult_journal",
        preview: Preview.ADULT_JOURNAL,
        label: "Adult journal",
        description: "Journal section backed by an empty adult-journal document.",
        auxiliaryCollections: [DB_COLLECTIONS.ADULT_JOURNALS],
    },
    {
        id: "animal_tag",
        preview: Preview.ANIMAL_TAG,
        label: "Animal tag",
        description: "Pet tag profile backed by an empty animal-tag document.",
        auxiliaryCollections: [DB_COLLECTIONS.ANIMAL_TAG],
    },
];

export interface ProductCreationDraft {
    mode: ProductCreationMode;
    productType: ProductType;
    quantity: number;
    name: string;
    capabilities: CapabilityId[];
}

export interface ProductCreationValidationError {
    field: keyof ProductCreationDraft | "form";
    message: string;
}

export interface ProductCreationRequest {
    requestId: string;
    mode: ProductCreationMode;
    productType: ProductType;
    quantity: number;
    name?: string;
    capabilities: CapabilityId[];
}

export interface ProductCreationResultItem {
    requestItemId: string;
    status: "created" | "failed";
    productId?: string;
    unlockCode?: string;
    productType: ProductType;
    name: string;
    capabilities: CapabilityId[];
    error?: string;
    createdAt?: string;
}

export interface ProductCreationResponse {
    requestId: string;
    results: ProductCreationResultItem[];
}

export interface ProductCreationDocuments {
    product: ProductFirestoreData;
    permissions: Permissions;
    auxiliaryCollections: DB_COLLECTIONS[];
}

export const emptyProductCreationDraft: ProductCreationDraft = {
    mode: "single",
    productType: PRODUCT_TYPES.GENERIC,
    quantity: 1,
    name: "",
    capabilities: [],
};

export function isProductType(value: string): value is ProductType {
    return Object.values(PRODUCT_TYPES).includes(value as ProductType);
}

export function isCapabilityId(value: string): value is CapabilityId {
    return PRODUCT_CAPABILITIES.some((capability) => capability.id === value);
}

export function getCapabilityLabels(capabilities: CapabilityId[]) {
    return PRODUCT_CAPABILITIES
        .filter((capability) => capabilities.includes(capability.id))
        .map((capability) => capability.label);
}

export function capabilitySelectionToPermissions(selection: CapabilityId[]): Permissions {
    const selected = new Set(selection);
    return PRODUCT_CAPABILITIES.reduce<Permissions>((permissions, capability) => ({
        ...permissions,
        [capability.id]: selected.has(capability.id),
    }), {
        business_card: false,
        custom_link: false,
        upload_files: false,
        upload_video: false,
        upload_songs: false,
        baby_journal: false,
        adult_journal: false,
        animal_tag: false,
    });
}

export function capabilitySelectionToVisibleSections(selection: CapabilityId[]): Preview[] {
    const selected = new Set(selection);
    return PRODUCT_CAPABILITIES
        .filter((capability) => selected.has(capability.id))
        .map((capability) => capability.preview);
}

export function requiredAuxiliaryCollections(selection: CapabilityId[]): DB_COLLECTIONS[] {
    const selected = new Set(selection);
    const collections = PRODUCT_CAPABILITIES
        .filter((capability) => selected.has(capability.id))
        .flatMap((capability) => capability.auxiliaryCollections);
    return collections.filter((collection, index) => collections.indexOf(collection) === index);
}

export function validateProductCreationDraft(draft: ProductCreationDraft): ProductCreationValidationError[] {
    const errors: ProductCreationValidationError[] = [];
    if (!isProductType(draft.productType)) {
        errors.push({field: "productType", message: "Select a supported product type."});
    }
    if (draft.mode !== "single" && draft.mode !== "multiple") {
        errors.push({field: "mode", message: "Select a creation mode."});
    }
    if (!Number.isInteger(draft.quantity) || draft.quantity < 1) {
        errors.push({field: "quantity", message: "Quantity must be at least 1."});
    }
    if (draft.quantity > MAX_PRODUCT_CREATION_QUANTITY) {
        errors.push({field: "quantity", message: `Quantity cannot exceed ${MAX_PRODUCT_CREATION_QUANTITY}.`});
    }
    if (draft.mode === "single" && draft.quantity !== 1) {
        errors.push({field: "quantity", message: "Single-product creation always creates exactly 1 product."});
    }
    if (draft.capabilities.length === 0) {
        errors.push({field: "capabilities", message: "Select at least one content capability."});
    }
    if (draft.capabilities.some((capability) => !isCapabilityId(capability))) {
        errors.push({field: "capabilities", message: "One or more selected capabilities are unsupported."});
    }
    return errors;
}

export function normalizeProductCreationDraft(draft: ProductCreationDraft): ProductCreationDraft {
    const mode = draft.mode === "multiple" ? "multiple" : "single";
    const quantity = mode === "single" ? 1 : Math.max(1, Math.min(Math.floor(Number(draft.quantity) || 1), MAX_PRODUCT_CREATION_QUANTITY));
    const capabilities = PRODUCT_CAPABILITIES
        .map((capability) => capability.id)
        .filter((capability) => draft.capabilities.includes(capability));
    return {
        mode,
        productType: isProductType(draft.productType) ? draft.productType : PRODUCT_TYPES.GENERIC,
        quantity,
        name: draft.name.trim(),
        capabilities,
    };
}

export function draftToCreationRequest(draft: ProductCreationDraft, requestId: string): ProductCreationRequest {
    const normalized = normalizeProductCreationDraft(draft);
    return {
        requestId,
        mode: normalized.mode,
        productType: normalized.productType,
        quantity: normalized.quantity,
        name: normalized.name || undefined,
        capabilities: normalized.capabilities,
    };
}

export function getDefaultProductName(productType: ProductType, name: string) {
    return name.trim() || PRODUCT_TYPE_LABELS[productType];
}

export function buildProductCreationDocuments({
    name,
    productType,
    capabilities,
    unlockCode,
    timestamp,
}: {
    name: string;
    productType: ProductType;
    capabilities: CapabilityId[];
    unlockCode: string;
    timestamp: unknown;
}): ProductCreationDocuments {
    const visibleSections = capabilitySelectionToVisibleSections(capabilities);
    if (visibleSections.length === 0) {
        throw new Error("At least one capability is required to build a product.");
    }
    if (!isProductType(productType)) {
        throw new Error("Unsupported product type.");
    }
    if (!isValidUnlockCode(unlockCode)) {
        throw new Error("Unlock code must be six uppercase hexadecimal characters.");
    }

    return {
        product: {
            name: getDefaultProductName(productType, name),
            productType,
            administrativeStatus: "active",
            ownerId: null,
            activated: false,
            unlockCode,
            visibleSections,
            preview: visibleSections[0],
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        permissions: capabilitySelectionToPermissions(capabilities),
        auxiliaryCollections: requiredAuxiliaryCollections(capabilities),
    };
}

export function isValidUnlockCode(value: string) {
    return /^[0-9A-F]{6}$/.test(value);
}

export function unlockCodeFromThreeBytes(bytes: Uint8Array) {
    if (bytes.length !== 3) {
        throw new Error("Unlock code generation requires exactly three random bytes.");
    }
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

export function productCreationResultsToCsvRows(results: ProductCreationResultItem[]) {
    return results.map((result) => ({
        productId: result.productId || "",
        unlockCode: result.unlockCode || "",
        productType: result.productType,
        name: result.name,
        capabilities: getCapabilityLabels(result.capabilities).join("; "),
        status: result.status,
        error: result.error || "",
        createdAt: result.createdAt || "",
    }));
}

