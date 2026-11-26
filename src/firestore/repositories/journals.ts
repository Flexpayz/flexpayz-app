import {getDoc, setDoc, updateDoc} from "firebase/firestore";
import {db} from "../../firebase";
import {normalizeAdultJournal} from "../../adult-journal";
import {normalizeBabyJournal} from "../../baby-journal";
import type {AdultJournalInformation} from "../../components/adult-journal-settings";
import type {BabyJournalInformation} from "../../components/baby-journal-settings";
import {DB_COLLECTIONS, documentRef} from "../collections";
import {AdultJournalFirestoreData, adultJournalFirestoreSchema, BabyJournalFirestoreData, babyJournalFirestoreSchema, JournalUpdateInput} from "../schema/journals";
import {parseFirestoreData, toFirestoreUpdate} from "../schema/primitives";

export async function getBabyJournal(productId: string): Promise<BabyJournalInformation> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.BABY_JOURNALS, productId));
    if (!snapshot.exists()) return normalizeBabyJournal({});
    parseFirestoreData(DB_COLLECTIONS.BABY_JOURNALS, productId, babyJournalFirestoreSchema, snapshot.data());
    return normalizeBabyJournal(snapshot.data());
}

export async function getAdultJournal(productId: string): Promise<AdultJournalInformation> {
    const snapshot = await getDoc(documentRef(db, DB_COLLECTIONS.ADULT_JOURNALS, productId));
    if (!snapshot.exists()) return normalizeAdultJournal({});
    parseFirestoreData(DB_COLLECTIONS.ADULT_JOURNALS, productId, adultJournalFirestoreSchema, snapshot.data());
    return normalizeAdultJournal(snapshot.data());
}

export async function updateBabyJournal(productId: string, input: JournalUpdateInput) {
    await updateDoc(documentRef<BabyJournalFirestoreData>(db, DB_COLLECTIONS.BABY_JOURNALS, productId), toFirestoreUpdate<BabyJournalFirestoreData>(input));
}

export async function updateAdultJournal(productId: string, input: JournalUpdateInput) {
    await updateDoc(documentRef<AdultJournalFirestoreData>(db, DB_COLLECTIONS.ADULT_JOURNALS, productId), toFirestoreUpdate<AdultJournalFirestoreData>(input));
}

export async function createEmptyBabyJournal(productId: string) {
    await setDoc(documentRef(db, DB_COLLECTIONS.BABY_JOURNALS, productId), {});
}

export async function createEmptyAdultJournal(productId: string) {
    await setDoc(documentRef(db, DB_COLLECTIONS.ADULT_JOURNALS, productId), {});
}
