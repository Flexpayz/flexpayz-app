import {arrayUnion, getDoc, setDoc, updateDoc} from "firebase/firestore";
import {db} from "../../firebase";
import {DB_COLLECTIONS, documentRef} from "../collections";
import {parseFirestoreData} from "../schema/primitives";
import {normalizeUserProfile, UserCreateInput, userFirestoreSchema, UserProfile} from "../schema/users";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.USERS, userId));
    if (!snapshot.exists()) return null;
    parseFirestoreData(DB_COLLECTIONS.USERS, userId, userFirestoreSchema, snapshot.data());
    return normalizeUserProfile(snapshot.data());
}

export async function createUserProfile(userId: string, input: UserCreateInput) {
    await setDoc(documentRef(db, DB_COLLECTIONS.USERS, userId), input);
}

export async function addProductToUser(userId: string, productId: string) {
    await updateDoc(documentRef(db, DB_COLLECTIONS.USERS, userId), {
        products: arrayUnion(productId),
    });
}
