import {
    documentId,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    where,
    QueryConstraint,
    QueryDocumentSnapshot,
} from "firebase/firestore";
import {db} from "../../firebase";
import {Preview} from "../../preview";
import {
    AdminProduct,
    AdminProductRelatedData,
    normalizeAdminProductDocument,
    normalizeSerialSummary,
    PaginatedProductQueryResult,
    SerialSummary,
    UserOwnerSummary,
} from "../../admin/products/adminProductModel";
import {DB_COLLECTIONS, collectionRef, documentRef} from "../collections";
import {normalizePermissions, Permissions, permissionsFirestoreSchema} from "../schema/permissions";
import {normalizeProduct, Product, ProductFirestoreData, productFirestoreSchema} from "../schema/products";
import type {ProductAdministrativeStatus} from "../schema/products";
import {parseFirestoreData} from "../schema/primitives";
import {normalizeSerialNumber, serialNumberFirestoreSchema} from "../schema/serialNumbers";
import {normalizeUserProfile, userFirestoreSchema} from "../schema/users";

export type ProductDisplayStatusFilter =
    | "all"
    | "active"
    | "available"
    | "suspended"
    | "archived"
    | "transfer-pending"
    | "legacy-data-issue";

export type ProductAdministrativeStatusFilter = "all" | ProductAdministrativeStatus;
export type OwnedFilter = "all" | "owned" | "unowned";
export type SerialFilter = "all" | "with-serial" | "without-serial" | "serial-conflict";
export type HealthFilter = "all" | "with-issues";
export type AccessFilter = "all" | keyof Permissions;

export interface AdminProductListQuery {
    pageSize: number;
    page?: number;
    cursor?: string | null;
    search?: string;
    displayStatus?: ProductDisplayStatusFilter;
    administrativeStatus?: ProductAdministrativeStatusFilter;
    owned?: OwnedFilter;
    productType?: string;
    serial?: SerialFilter;
    content?: Preview | "all";
    access?: AccessFilter;
    health?: HealthFilter;
    includeArchived?: boolean;
}

type RawProductDocument = {
    id: string;
    raw: ProductFirestoreData;
    product: Product;
    snapshot: QueryDocumentSnapshot;
};

type PermissionsByProductId = Map<string, {permissions: Permissions; exists: boolean}>;
type SerialByProductId = Map<string, SerialSummary[]>;
type OwnerByProductId = Map<string, UserOwnerSummary>;

export async function listAdminProducts(input: AdminProductListQuery): Promise<PaginatedProductQueryResult> {
    const pageSize = clampPageSize(input.pageSize);
    const requestedPage = clampPage(input.page);
    const search = normalizeSearch(input.search);

    if (search) {
        return searchAdminProducts({...input, pageSize, page: requestedPage, search});
    }

    const serverConstraints = buildServerProductConstraints(input);
    const baseQuery = query(collectionRef<ProductFirestoreData>(db, DB_COLLECTIONS.PRODUCTS), ...serverConstraints);
    const countSnapshot = await getCountFromServer(baseQuery);
    const totalCount = countSnapshot.data().count;
    const totalPages = getTotalPages(totalCount, pageSize);
    const page = Math.min(requestedPage, totalPages);
    const pageConstraints: QueryConstraint[] = [
        ...serverConstraints,
        orderBy(documentId()),
    ];
    if (input.cursor) pageConstraints.push(startAfter(input.cursor));
    pageConstraints.push(limit(pageSize));

    const snapshot = await getDocs(query(collectionRef<ProductFirestoreData>(db, DB_COLLECTIONS.PRODUCTS), ...pageConstraints));
    const rawDocs = snapshot.docs.map(toRawProductDocument);
    const {products, partialWarning} = await normalizeAdminProductPage(rawDocs);
    const visible = applyClientFilters(products, input);
    const nextCursor = snapshot.docs[snapshot.docs.length - 1]?.id || null;

    return {
        products: visible,
        nextCursor,
        pageSize,
        page,
        totalCount,
        totalPages,
        partialWarning: getPartialWarning(partialWarning, input),
    };
}

export async function getAdminProduct(productId: string): Promise<AdminProduct | null> {
    const snapshot = await getDoc(documentRef<ProductFirestoreData>(db, DB_COLLECTIONS.PRODUCTS, productId));
    if (!snapshot.exists()) return null;

    const raw = snapshot.data();
    parseFirestoreData(DB_COLLECTIONS.PRODUCTS, productId, productFirestoreSchema, raw);
    const [product] = await normalizeAdminProductPage([
        {
            id: productId,
            raw,
            product: normalizeProduct(raw),
            snapshot: snapshot as unknown as QueryDocumentSnapshot,
        },
    ]).then((result) => result.products);

    return product || null;
}

async function searchAdminProducts(input: AdminProductListQuery & {pageSize: number; page: number; search: string}): Promise<PaginatedProductQueryResult> {
    const rawDocsById = new Map<string, RawProductDocument>();
    const directProduct = await getRawProduct(input.search);
    if (directProduct) rawDocsById.set(directProduct.id, directProduct);

    const unlockSnapshot = await getDocs(query(
        collectionRef<ProductFirestoreData>(db, DB_COLLECTIONS.PRODUCTS),
        where("unlockCode", "==", input.search.toUpperCase()),
        limit(input.pageSize),
    ));
    unlockSnapshot.docs.map(toRawProductDocument).forEach((doc) => rawDocsById.set(doc.id, doc));

    const serialDoc = await getDoc(documentRef(db, DB_COLLECTIONS.SERIAL_NUMBERS, input.search));
    if (serialDoc.exists()) {
        parseFirestoreData(DB_COLLECTIONS.SERIAL_NUMBERS, serialDoc.id, serialNumberFirestoreSchema, serialDoc.data());
        const serial = normalizeSerialNumber(serialDoc.data());
        if (serial.productID) {
            const serialProduct = await getRawProduct(serial.productID);
            if (serialProduct) rawDocsById.set(serialProduct.id, serialProduct);
        }
    }

    const rawDocs = Array.from(rawDocsById.values());
    const {products, partialWarning} = await normalizeAdminProductPage(rawDocs);
    const filtered = applyClientFilters(products, input);
    const totalCount = filtered.length;
    const totalPages = getTotalPages(totalCount, input.pageSize);
    const page = Math.min(input.page, totalPages);

    return {
        products: slicePage(filtered, page, input.pageSize),
        nextCursor: null,
        pageSize: input.pageSize,
        page,
        totalCount,
        totalPages,
        partialWarning: partialWarning || "Search supports exact product ID, exact unlock code and exact serial number. Owner/name full-text search needs a backend search index.",
    };
}

function buildServerProductConstraints(input: AdminProductListQuery) {
    const constraints: QueryConstraint[] = [];
    const displayStatus = input.displayStatus || "all";
    const adminStatus = input.administrativeStatus || "all";

    if (adminStatus !== "all") {
        constraints.push(where("administrativeStatus", "==", adminStatus));
    } else if (displayStatus === "suspended" || displayStatus === "archived") {
        constraints.push(where("administrativeStatus", "==", displayStatus));
    }

    if (displayStatus === "active") {
        constraints.push(where("activated", "==", true));
    }
    if (displayStatus === "available") {
        constraints.push(where("activated", "==", false));
    }

    return constraints;
}

function getPartialWarning(partialWarning: string | undefined, input: AdminProductListQuery) {
    const pageScopedFilters = [
        input.displayStatus === "legacy-data-issue" || input.displayStatus === "transfer-pending",
        input.owned && input.owned !== "all",
        input.productType && input.productType !== "all",
        input.serial && input.serial !== "all",
        input.content && input.content !== "all",
        input.access && input.access !== "all",
        input.health === "with-issues",
    ].some(Boolean);

    const pageScopedWarning = pageScopedFilters
        ? "Some selected filters use related records and are applied to the loaded page only in this fast pagination view."
        : "";

    return [partialWarning, pageScopedWarning].filter(Boolean).join(" ");
}

async function getRawProduct(productId: string): Promise<RawProductDocument | null> {
    const snapshot = await getDoc(documentRef<ProductFirestoreData>(db, DB_COLLECTIONS.PRODUCTS, productId));
    if (!snapshot.exists()) return null;
    const raw = snapshot.data();
    parseFirestoreData(DB_COLLECTIONS.PRODUCTS, snapshot.id, productFirestoreSchema, raw);
    return {
        id: snapshot.id,
        raw,
        product: normalizeProduct(raw),
        snapshot: snapshot as unknown as QueryDocumentSnapshot,
    };
}

async function normalizeAdminProductPage(rawDocs: RawProductDocument[]): Promise<{products: AdminProduct[]; partialWarning?: string}> {
    const productIds = rawDocs.map((doc) => doc.id);
    const [serialsByProductId, permissionsByProductId, ownersByProductId] = await Promise.all([
        getSerialsByProductIds(productIds),
        getPermissionsByProductIds(productIds),
        getOwnersByProductDocuments(rawDocs),
    ]);

    const products = rawDocs.map((doc) => {
        const modernOwnerId = doc.product.ownerId || null;
        const related: AdminProductRelatedData = {
            owner: modernOwnerId ? ownersByProductId.get(doc.id) || null : null,
            legacyOwner: !modernOwnerId ? ownersByProductId.get(doc.id) || null : null,
            serials: serialsByProductId.get(doc.id) || [],
            permissions: permissionsByProductId.get(doc.id)?.permissions || null,
            permissionsDocumentExists: permissionsByProductId.get(doc.id)?.exists === true,
            transferInvitation: null,
        };

        return normalizeAdminProductDocument(doc.id, doc.raw, doc.product, related);
    });

    return {
        products,
        partialWarning: "Legacy owner and serial resolution is bounded to this page. No automatic repair was performed.",
    };
}

async function getSerialsByProductIds(productIds: string[]): Promise<SerialByProductId> {
    const byProduct = new Map<string, SerialSummary[]>();
    for (const chunk of chunks(productIds, 10)) {
        if (chunk.length === 0) continue;
        const snapshot = await getDocs(query(
            collectionRef(db, DB_COLLECTIONS.SERIAL_NUMBERS),
            where("productID", "in", chunk),
        ));
        snapshot.docs.forEach((serialDoc) => {
            parseFirestoreData(DB_COLLECTIONS.SERIAL_NUMBERS, serialDoc.id, serialNumberFirestoreSchema, serialDoc.data());
            const serial = normalizeSerialSummary(serialDoc.id, normalizeSerialNumber(serialDoc.data()));
            const current = byProduct.get(serial.productID) || [];
            byProduct.set(serial.productID, [...current, serial]);
        });
    }
    return byProduct;
}

async function getPermissionsByProductIds(productIds: string[]): Promise<PermissionsByProductId> {
    const byProduct = new Map<string, {permissions: Permissions; exists: boolean}>();
    await Promise.all(productIds.map(async (productId) => {
        const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.PERMISSIONS, productId));
        if (!snapshot.exists()) {
            byProduct.set(productId, {permissions: normalizePermissions(null), exists: false});
            return;
        }

        parseFirestoreData(DB_COLLECTIONS.PERMISSIONS, productId, permissionsFirestoreSchema, snapshot.data());
        byProduct.set(productId, {permissions: normalizePermissions(snapshot.data()), exists: true});
    }));
    return byProduct;
}

async function getOwnersByProductDocuments(rawDocs: RawProductDocument[]): Promise<OwnerByProductId> {
    const byProduct = new Map<string, UserOwnerSummary>();
    await Promise.all(rawDocs.map(async (productDoc) => {
        const ownerId = productDoc.product.ownerId || "";
        if (!ownerId) return;

        const userDoc = await getDoc(documentRef(db, DB_COLLECTIONS.USERS, ownerId));
        if (!userDoc.exists()) return;

        parseFirestoreData(DB_COLLECTIONS.USERS, userDoc.id, userFirestoreSchema, userDoc.data());
        const profile = normalizeUserProfile(userDoc.data());
        const data = userDoc.data() as Record<string, unknown>;
        byProduct.set(productDoc.id, {
            uid: userDoc.id,
            displayName: asString(data.displayName) || asString(data.name) || "Unknown user",
            email: asString(data.email),
            productListContainsProduct: profile.products.includes(productDoc.id),
        });
    }));

    const productIds = rawDocs.map((doc) => doc.id);
    for (const chunk of chunks(productIds, 10)) {
        if (chunk.length === 0) continue;
        const snapshot = await getDocs(query(
            collectionRef(db, DB_COLLECTIONS.USERS),
            where("products", "array-contains-any", chunk),
            limit(25),
        ));
        snapshot.docs.forEach((userDoc) => {
            parseFirestoreData(DB_COLLECTIONS.USERS, userDoc.id, userFirestoreSchema, userDoc.data());
            const profile = normalizeUserProfile(userDoc.data());
            const data = userDoc.data() as Record<string, unknown>;
            profile.products.forEach((productId) => {
                if (!chunk.includes(productId) || byProduct.has(productId)) return;
                byProduct.set(productId, {
                    uid: userDoc.id,
                    displayName: asString(data.displayName) || asString(data.name) || "Unknown user",
                    email: asString(data.email),
                    productListContainsProduct: true,
                });
            });
        });
    }
    return byProduct;
}

function applyClientFilters(products: AdminProduct[], input: AdminProductListQuery) {
    return products.filter((product) => {
        if (!input.includeArchived && product.displayStatus === "archived") return false;
        if (input.displayStatus && input.displayStatus !== "all" && product.displayStatus !== input.displayStatus) return false;
        if (input.administrativeStatus && input.administrativeStatus !== "all" && product.administrativeStatus !== input.administrativeStatus) return false;
        if (input.owned === "owned" && !product.ownership.ownerId) return false;
        if (input.owned === "unowned" && product.ownership.ownerId) return false;
        if (input.productType && input.productType !== "all" && product.productType !== input.productType) return false;
        if (input.serial === "with-serial" && product.serialState === "none") return false;
        if (input.serial === "without-serial" && product.serialState !== "none") return false;
        if (input.serial === "serial-conflict" && product.serialState !== "conflict") return false;
        if (input.content && input.content !== "all" && !product.selectedContent.includes(input.content)) return false;
        if (input.access && input.access !== "all" && !product.capabilities.permissions[input.access]) return false;
        if (input.health === "with-issues" && product.dataHealth.length === 0) return false;
        return true;
    });
}

function toRawProductDocument(snapshot: QueryDocumentSnapshot<ProductFirestoreData>): RawProductDocument {
    const raw = snapshot.data();
    parseFirestoreData(DB_COLLECTIONS.PRODUCTS, snapshot.id, productFirestoreSchema, raw);
    return {
        id: snapshot.id,
        raw,
        product: normalizeProduct(raw),
        snapshot,
    };
}

function clampPageSize(pageSize: number) {
    if (!Number.isFinite(pageSize)) return 25;
    return Math.max(5, Math.min(Math.floor(pageSize), 25));
}

function clampPage(page: number | undefined) {
    if (!Number.isFinite(page)) return 1;
    return Math.max(1, Math.floor(page || 1));
}

function getTotalPages(totalCount: number, pageSize: number) {
    return Math.max(1, Math.ceil(totalCount / pageSize));
}

function slicePage<T>(items: T[], page: number, pageSize: number) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

function normalizeSearch(value: string | undefined) {
    return (value || "").trim();
}

function chunks<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }
    return result;
}

function asString(value: unknown) {
    return typeof value === "string" ? value : "";
}
