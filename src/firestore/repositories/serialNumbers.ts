import {getDoc, getDocs, query, serverTimestamp, updateDoc, where, WriteBatch, QueryDocumentSnapshot} from "firebase/firestore";
import {db} from "../../firebase";
import {DB_COLLECTIONS, collectionRef, documentRef} from "../collections";
import type {FirestoreDocument} from "../schema/primitives";
import {parseFirestoreData, stripUndefined, toFirestoreUpdate} from "../schema/primitives";
import {
    normalizeSerialNumber,
    SerialNumberCreateInput,
    SerialNumberFirestoreData,
    SerialNumberRecord,
    serialNumberFirestoreSchema,
    SerialNumberUpdateInput,
} from "../schema/serialNumbers";

export async function getSerialNumber(serialNumber: string): Promise<FirestoreDocument<SerialNumberRecord> | null> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.SERIAL_NUMBERS, serialNumber));
    if (!snapshot.exists()) return null;
    parseFirestoreData(DB_COLLECTIONS.SERIAL_NUMBERS, serialNumber, serialNumberFirestoreSchema, snapshot.data());
    return {id: serialNumber, data: normalizeSerialNumber(snapshot.data())};
}

export async function listSerialNumbers(): Promise<FirestoreDocument<SerialNumberRecord>[]> {
    const snapshot = await getDocs(collectionRef(db, DB_COLLECTIONS.SERIAL_NUMBERS));
    return snapshot.docs.map((serialDoc) => {
        parseFirestoreData(DB_COLLECTIONS.SERIAL_NUMBERS, serialDoc.id, serialNumberFirestoreSchema, serialDoc.data());
        return {id: serialDoc.id, data: normalizeSerialNumber(serialDoc.data())};
    });
}

export async function getSerialNumberDocsByProductID(productID: string): Promise<QueryDocumentSnapshot[]> {
    const serialNumbersQuery = query(collectionRef(db, DB_COLLECTIONS.SERIAL_NUMBERS), where("productID", "==", productID));
    const snapshot = await getDocs(serialNumbersQuery);
    return snapshot.docs as QueryDocumentSnapshot[];
}

export function setSerialNumberInBatch(batch: WriteBatch, serialNumber: string, input: Omit<SerialNumberCreateInput, "createdAt">) {
    batch.set(documentRef(db, DB_COLLECTIONS.SERIAL_NUMBERS, serialNumber), {
        ...stripUndefined(input),
        createdAt: serverTimestamp(),
    });
}

export function updateSerialNumberInBatch(batch: WriteBatch, serialDoc: QueryDocumentSnapshot, input: SerialNumberUpdateInput) {
    batch.update(serialDoc.ref, toFirestoreUpdate<SerialNumberFirestoreData>(input));
}

export async function updateSerialNumber(serialNumber: string, input: SerialNumberUpdateInput) {
    await updateDoc(documentRef<SerialNumberFirestoreData>(db, DB_COLLECTIONS.SERIAL_NUMBERS, serialNumber), toFirestoreUpdate<SerialNumberFirestoreData>(input));
}
