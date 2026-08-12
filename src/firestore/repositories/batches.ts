import {writeBatch} from "firebase/firestore";
import {db} from "../../firebase";

export function createFirestoreBatch() {
    return writeBatch(db);
}
