import {addDoc, getDoc, getDocs, limit, query, updateDoc, where, WriteBatch, DocumentReference, arrayUnion, QueryDocumentSnapshot} from "firebase/firestore";
import {db} from "../../firebase";
import {DB_COLLECTIONS, collectionRef, documentRef, newDocumentRef} from "../collections";
import type {FirestoreDocument} from "../schema/primitives";
import {parseFirestoreData} from "../schema/primitives";
import {
    normalizeProduct,
    Product,
    ProductCreateInput,
    productFirestoreSchema,
    ProductUpdateInput,
    serializeProductCreate,
    serializeProductUpdate,
    SharedContact,
} from "../schema/products";

export async function getProduct(productId: string): Promise<Product | null> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.PRODUCTS, productId));
    if (!snapshot.exists()) return null;
    parseFirestoreData(DB_COLLECTIONS.PRODUCTS, productId, productFirestoreSchema, snapshot.data());
    return normalizeProduct(snapshot.data());
}

export async function getProductDocument(productId: string): Promise<FirestoreDocument<Product> | null> {
    const data = await getProduct(productId);
    return data ? {id: productId, data} : null;
}

export async function createProduct(input: ProductCreateInput): Promise<FirestoreDocument<Product>> {
    const created = await addDoc(collectionRef(db, DB_COLLECTIONS.PRODUCTS), serializeProductCreate(input));
    return {
        id: created.id,
        data: normalizeProduct(input),
    };
}

export function createProductDocumentReference(): DocumentReference<ProductCreateInput> {
    return newDocumentRef<ProductCreateInput>(db, DB_COLLECTIONS.PRODUCTS);
}

export function setProductInBatch(batch: WriteBatch, ref: DocumentReference<ProductCreateInput>, input: ProductCreateInput) {
    batch.set(ref, serializeProductCreate(input));
}

export async function updateProduct(productId: string, input: ProductUpdateInput) {
    await updateDoc(documentRef(db, DB_COLLECTIONS.PRODUCTS, productId), serializeProductUpdate(input));
}

export async function addSharedContact(productId: string, contact: SharedContact) {
    await updateDoc(documentRef(db, DB_COLLECTIONS.PRODUCTS, productId), {
        sharedContacts: arrayUnion(contact),
    });
}

export async function listInactiveProducts(): Promise<FirestoreDocument<Product>[]> {
    const productsQuery = query(collectionRef(db, DB_COLLECTIONS.PRODUCTS), where("activated", "==", false));
    const snapshot = await getDocs(productsQuery);
    return getQuerySnapshotDocs(snapshot).map((productDoc) => {
        parseFirestoreData(DB_COLLECTIONS.PRODUCTS, productDoc.id, productFirestoreSchema, productDoc.data());
        return {id: productDoc.id, data: normalizeProduct(productDoc.data())};
    });
}

export async function findProductsByUnlockCode(unlockCode: string): Promise<FirestoreDocument<Product>[]> {
    const productsQuery = query(collectionRef(db, DB_COLLECTIONS.PRODUCTS), where("unlockCode", "==", unlockCode), limit(1));
    const snapshot = await getDocs(productsQuery);
    return getQuerySnapshotDocs(snapshot).map((productDoc) => {
        parseFirestoreData(DB_COLLECTIONS.PRODUCTS, productDoc.id, productFirestoreSchema, productDoc.data());
        return {id: productDoc.id, data: normalizeProduct(productDoc.data())};
    });
}

function getQuerySnapshotDocs(snapshot: unknown): Array<Pick<QueryDocumentSnapshot, "id" | "data">> {
    if (snapshot && typeof snapshot === "object" && Array.isArray((snapshot as {docs?: unknown}).docs)) {
        return (snapshot as {docs: Array<Pick<QueryDocumentSnapshot, "id" | "data">>}).docs;
    }

    const docs: Array<Pick<QueryDocumentSnapshot, "id" | "data">> = [];
    if (snapshot && typeof snapshot === "object" && typeof (snapshot as {forEach?: unknown}).forEach === "function") {
        (snapshot as {forEach: (callback: (doc: Pick<QueryDocumentSnapshot, "id" | "data">) => void) => void}).forEach((docSnapshot) => {
            docs.push(docSnapshot);
        });
    }
    return docs;
}
