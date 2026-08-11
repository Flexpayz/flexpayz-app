import {getDoc, setDoc, updateDoc} from "firebase/firestore";
import {db} from "../../firebase";
import {DB_COLLECTIONS, documentRef} from "../collections";
import {
    AnimalTagConfig,
    AnimalTagFirestoreData,
    AnimalTagUpdateInput,
    animalTagFirestoreSchema,
    normalizeAnimalTag,
    serializeAnimalTagUpdate,
} from "../schema/animalTag";
import {parseFirestoreData} from "../schema/primitives";
import {toFirestoreUpdate} from "../schema/primitives";

export async function getAnimalTag(productId: string): Promise<AnimalTagConfig> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.ANIMAL_TAG, productId));
    if (!snapshot.exists()) return normalizeAnimalTag({});
    parseFirestoreData(DB_COLLECTIONS.ANIMAL_TAG, productId, animalTagFirestoreSchema, snapshot.data());
    return normalizeAnimalTag(snapshot.data());
}

export async function updateAnimalTag(productId: string, input: AnimalTagUpdateInput) {
    await updateDoc(documentRef<AnimalTagFirestoreData>(db, DB_COLLECTIONS.ANIMAL_TAG, productId), toFirestoreUpdate<AnimalTagFirestoreData>(serializeAnimalTagUpdate(input)));
}

export async function createEmptyAnimalTag(productId: string) {
    await setDoc(documentRef(db, DB_COLLECTIONS.ANIMAL_TAG, productId), {});
}
