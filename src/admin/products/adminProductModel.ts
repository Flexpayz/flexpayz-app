import {Preview} from "../../preview";
import type {Permissions} from "../../firestore/schema/permissions";
import {defaultPermissions} from "../../firestore/schema/permissions";
import type {Product, ProductAdministrativeStatus, ProductFirestoreData} from "../../firestore/schema/products";
import {PRODUCT_TYPES} from "../../firestore/schema/products";
import {normalizePreview, normalizeVisibleSections} from "../../firestore/schema/products";
import type {SerialNumberRecord} from "../../firestore/schema/serialNumbers";
import {normalizeDateLike, safeString} from "../../firestore/schema/primitives";

export type ProductDisplayStatus =
    | "archived"
    | "suspended"
    | "transfer-pending"
    | "legacy-data-issue"
    | "available"
    | "active";

export type ProductOwnershipState = "owned" | "available" | "legacy-unresolved";
export type ProductSerialState = "none" | "assigned" | "conflict";
export type DataHealthSeverity = "warning" | "critical";

export interface ProductOwnership {
    ownerId: string | null;
}

export interface UserOwnerSummary {
    uid: string;
    displayName: string;
    email: string;
    productListContainsProduct: boolean;
}

export interface SerialSummary {
    serialNumber: string;
    productID: string;
    type: string;
    redirectUrl?: string;
}

export interface ProductCapabilities {
    permissions: Permissions;
    permissionsDocumentExists: boolean;
}

export interface TransferInvitation {
    id: string;
    recipientEmail: string;
    status: "pending" | "cancelled" | "accepted" | "expired";
    expiresAt: Date | null;
}

export interface ProductActivityEntry {
    id: string;
    action: string;
    actor: string;
    reason: string;
    timestamp: Date | null;
    summary: string;
}

export interface DataHealthIssue {
    code:
        | "missing-permissions"
        | "unresolved-owner"
        | "owner-relationship-missing"
        | "multiple-serials"
        | "serial-mismatch"
        | "invalid-unlock-code"
        | "unknown-product-type"
        | "invalid-content-value"
        | "unsupported-legacy-data";
    severity: DataHealthSeverity;
    message: string;
}

export interface AdminProduct {
    id: string;
    raw: ProductFirestoreData;
    product: Product;
    name: string;
    productType: string | null;
    administrativeStatus: ProductAdministrativeStatus;
    ownership: ProductOwnership;
    ownershipState: ProductOwnershipState;
    owner: UserOwnerSummary | null;
    serials: SerialSummary[];
    serialState: ProductSerialState;
    selectedContent: Preview[];
    capabilities: ProductCapabilities;
    transferInvitation: TransferInvitation | null;
    dataHealth: DataHealthIssue[];
    displayStatus: ProductDisplayStatus;
    createdAt: Date | null;
    updatedAt: Date | null;
    publicUrl: string;
    unlockCode: string;
}

export interface AdminProductRelatedData {
    owner?: UserOwnerSummary | null;
    legacyOwner?: UserOwnerSummary | null;
    serials?: SerialSummary[];
    permissions?: Permissions | null;
    permissionsDocumentExists?: boolean;
    transferInvitation?: TransferInvitation | null;
}

export interface PaginatedProductQueryResult {
    products: AdminProduct[];
    nextCursor: string | null;
    hasMore: boolean;
    pageSize: number;
    partialWarning?: string;
}

export const CONTENT_LABELS: Record<Preview, string> = {
    [Preview.BUSINESS_CARD]: "Business card",
    [Preview.CUSTOM_LINK]: "Custom link",
    [Preview.UPLOAD_FILE]: "Files",
    [Preview.UPLOAD_VIDEO]: "Video",
    [Preview.UPLOAD_SONGS]: "Songs",
    [Preview.BABY_JOURNAL]: "Baby journal",
    [Preview.ADULT_JOURNAL]: "Adult journal",
    [Preview.ANIMAL_TAG]: "Animal tag",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
    [PRODUCT_TYPES.FLEX_RING]: "Flex Ring",
    [PRODUCT_TYPES.FLEX_CARD]: "Flex Card",
    [PRODUCT_TYPES.FLEX_BRACELET]: "Flex Bracelet",
    [PRODUCT_TYPES.PET_TAG]: "Pet Tag",
    [PRODUCT_TYPES.GENERIC]: "Generic/Unknown Product",
    ring: "Ring",
    card: "Card",
    tag: "Tag",
    "business-card": "Business card",
    "business_card": "Business card",
    "sanitas-payment-ring": "Sanitas payment ring",
};

const PREVIEW_PRODUCT_TYPE_LABELS: Partial<Record<Preview, string>> = {
    [Preview.BUSINESS_CARD]: "Business card",
    [Preview.CUSTOM_LINK]: "Custom link",
    [Preview.UPLOAD_FILE]: "Files",
    [Preview.UPLOAD_VIDEO]: "Video",
    [Preview.UPLOAD_SONGS]: "Songs",
    [Preview.BABY_JOURNAL]: "Baby journal",
    [Preview.ADULT_JOURNAL]: "Adult journal",
    [Preview.ANIMAL_TAG]: "Tag",
};

export function normalizeAdminProductDocument(
    id: string,
    raw: ProductFirestoreData,
    product: Product,
    relatedData: AdminProductRelatedData = {},
): AdminProduct {
    const administrativeStatus = product.administrativeStatus || "active";
    const ownerId = product.ownerId || relatedData.owner?.uid || relatedData.legacyOwner?.uid || null;
    const owner = relatedData.owner || relatedData.legacyOwner || null;
    const serials = relatedData.serials || [];
    const selectedContent = getSelectedContent(raw, product);
    const productType = normalizeProductType(raw, product);
    const permissionsDocumentExists = relatedData.permissionsDocumentExists === true;
    const capabilities = {
        permissions: relatedData.permissions || defaultPermissions,
        permissionsDocumentExists,
    };
    const issues = getDataHealthIssues({
        id,
        raw,
        product,
        ownerId,
        owner,
        serials,
        selectedContent,
        productType,
        permissionsDocumentExists,
    });
    const ownershipState = getOwnershipState(product, ownerId, owner);
    const serialState: ProductSerialState = serials.length > 1 ? "conflict" : serials.length === 1 ? "assigned" : "none";
    const displayStatus = getDisplayStatus(administrativeStatus, ownerId, relatedData.transferInvitation, issues);

    return {
        id,
        raw,
        product,
        name: product.name || "New Product",
        productType,
        administrativeStatus,
        ownership: {ownerId},
        ownershipState,
        owner,
        serials,
        serialState,
        selectedContent,
        capabilities,
        transferInvitation: relatedData.transferInvitation || null,
        dataHealth: issues,
        displayStatus,
        createdAt: normalizeDateLike(product.createdAt),
        updatedAt: normalizeDateLike(product.updatedAt),
        publicUrl: getPublicProductUrl(id),
        unlockCode: product.unlockCode,
    };
}

export function normalizeSerialSummary(serialNumber: string, data: SerialNumberRecord): SerialSummary {
    return {
        serialNumber,
        productID: data.productID,
        type: data.type,
        redirectUrl: data.redirectUrl,
    };
}

export function getPublicProductUrl(productId: string) {
    return `https://flexpayz.com/show-product?product_id=${productId}`;
}

export function getDisplayStatusLabel(status: ProductDisplayStatus) {
    const labels: Record<ProductDisplayStatus, string> = {
        archived: "Archived",
        suspended: "Suspended",
        "transfer-pending": "Transfer pending",
        "legacy-data-issue": "Legacy data issue",
        available: "Available",
        active: "Active",
    };
    return labels[status];
}

export function getContentLabels(content: Preview[]) {
    return content.map((section) => CONTENT_LABELS[section] || section);
}

function getSelectedContent(raw: ProductFirestoreData, product: Product) {
    const visibleSections = normalizeVisibleSections(raw.visibleSections);
    if (visibleSections && visibleSections.length > 0) return visibleSections;
    return [normalizePreview(raw.preview || product.preview)];
}

function normalizeProductType(raw: ProductFirestoreData, product: Product) {
    const candidate = safeString(raw.productType) || safeString(raw.category) || safeString(raw.type);
    if (!candidate) return PREVIEW_PRODUCT_TYPE_LABELS[normalizePreview(raw.preview || product.preview)] || null;
    const normalized = candidate.trim().toLowerCase().replace(/\s+/g, "-");
    return PRODUCT_TYPE_LABELS[normalized] || null;
}

function getOwnershipState(product: Product, ownerId: string | null, owner: UserOwnerSummary | null): ProductOwnershipState {
    if (!ownerId && product.activated === false) return "available";
    if (!ownerId && product.activated === true) return "legacy-unresolved";
    if (!owner) return "legacy-unresolved";
    return "owned";
}

function getDisplayStatus(
    administrativeStatus: ProductAdministrativeStatus,
    ownerId: string | null,
    invitation: TransferInvitation | null | undefined,
    issues: DataHealthIssue[],
): ProductDisplayStatus {
    if (administrativeStatus === "archived") return "archived";
    if (administrativeStatus === "suspended") return "suspended";
    if (invitation?.status === "pending") return "transfer-pending";
    if (issues.some((issue) => issue.severity === "critical")) return "legacy-data-issue";
    return ownerId ? "active" : "available";
}

function getDataHealthIssues({
    raw,
    product,
    ownerId,
    owner,
    serials,
    selectedContent,
    productType,
    permissionsDocumentExists,
}: {
    id: string;
    raw: ProductFirestoreData;
    product: Product;
    ownerId: string | null;
    owner: UserOwnerSummary | null;
    serials: SerialSummary[];
    selectedContent: Preview[];
    productType: string | null;
    permissionsDocumentExists: boolean;
}): DataHealthIssue[] {
    const issues: DataHealthIssue[] = [];

    if (!permissionsDocumentExists) {
        issues.push({code: "missing-permissions", severity: "warning", message: "Permissions document is missing. Defaults are shown until repaired."});
    }
    if (product.activated && !ownerId) {
        issues.push({code: "unresolved-owner", severity: "critical", message: "Legacy owner could not be resolved from users/{uid}.products."});
    }
    if (ownerId && owner && !owner.productListContainsProduct) {
        issues.push({code: "owner-relationship-missing", severity: "critical", message: "Owner document does not include this product ID."});
    }
    if (serials.length > 1) {
        issues.push({code: "multiple-serials", severity: "critical", message: "Multiple serial numbers point to this product."});
    }
    if (product.serialNumber && serials.length === 1 && serials[0].serialNumber !== product.serialNumber) {
        issues.push({code: "serial-mismatch", severity: "critical", message: "Stored serial metadata conflicts with serial-number mapping."});
    }
    if (product.unlockCode && !/^[A-Z0-9]{6,32}$/i.test(product.unlockCode)) {
        issues.push({code: "invalid-unlock-code", severity: "warning", message: "Unlock code has an unexpected format."});
    }
    if (!productType) {
        issues.push({code: "unknown-product-type", severity: "warning", message: "Product type is unknown in legacy data."});
    }
    if (selectedContent.length === 0) {
        issues.push({code: "invalid-content-value", severity: "warning", message: "No supported public content selection could be resolved."});
    }

    return issues;
}
