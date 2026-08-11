import {addDoc} from "firebase/firestore";
import {db} from "../../firebase";
import {DB_COLLECTIONS, collectionRef} from "../collections";
import {MailCreateInput, mailFirestoreSchema} from "../schema/mail";

export async function enqueueMail(input: MailCreateInput) {
    const parsed = mailFirestoreSchema.parse(input);
    await addDoc(collectionRef(db, DB_COLLECTIONS.MAIL), parsed);
}
