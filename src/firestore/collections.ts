import {
    collection,
    doc,
    CollectionReference,
    DocumentReference,
    Firestore,
} from "firebase/firestore";

export enum DB_COLLECTIONS {
    PRODUCTS = "products",
    SERIAL_NUMBERS = "serial_numbers",
    BABY_JOURNALS = "baby_journals",
    ADULT_JOURNALS = "adult_journals",
    PERMISSIONS = "permissions",
    ANIMAL_TAG = "animal_tag",
    MAIL = "mail",
    USERS = "users",
}

export type CollectionName = `${DB_COLLECTIONS}`;

export function collectionRef<T>(db: Firestore, collectionName: DB_COLLECTIONS): CollectionReference<T> {
    return collection(db, collectionName) as CollectionReference<T>;
}

export function documentRef<T>(db: Firestore, collectionName: DB_COLLECTIONS, documentId: string): DocumentReference<T> {
    return doc(db, collectionName, documentId) as DocumentReference<T>;
}

export function newDocumentRef<T>(db: Firestore, collectionName: DB_COLLECTIONS): DocumentReference<T> {
    return doc(collection(db, collectionName)) as DocumentReference<T>;
}

export function collectionPath(collectionName: DB_COLLECTIONS) {
    return collectionName;
}

export function documentPath(collectionName: DB_COLLECTIONS, documentId: string) {
    return `${collectionName}/${documentId}`;
}
