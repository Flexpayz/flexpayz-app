import {getDoc, setDoc, updateDoc, WriteBatch} from "firebase/firestore";
import {db} from "../../firebase";
import {DB_COLLECTIONS, documentRef} from "../collections";
import {
    defaultPermissions,
    normalizePermissions,
    Permissions,
    PermissionsCreateInput,
    permissionsFirestoreSchema,
    PermissionsUpdateInput,
} from "../schema/permissions";
import {parseFirestoreData} from "../schema/primitives";

export async function getPermissions(productId: string): Promise<Permissions> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.PERMISSIONS, productId));
    if (!snapshot.exists()) return defaultPermissions;
    parseFirestoreData(DB_COLLECTIONS.PERMISSIONS, productId, permissionsFirestoreSchema, snapshot.data());
    return normalizePermissions(snapshot.data());
}

export async function setPermissions(productId: string, input: PermissionsCreateInput) {
    await setDoc(documentRef(db, DB_COLLECTIONS.PERMISSIONS, productId), input);
}

export function setPermissionsInBatch(batch: WriteBatch, productId: string, input: PermissionsCreateInput) {
    batch.set(documentRef(db, DB_COLLECTIONS.PERMISSIONS, productId), input);
}

export async function updatePermissions(productId: string, input: PermissionsUpdateInput) {
    await updateDoc(documentRef(db, DB_COLLECTIONS.PERMISSIONS, productId), input);
}
