import {initializeApp} from "firebase/app";
import {Firestore, getFirestore} from "firebase/firestore";
import {FirebaseStorage, getStorage} from "firebase/storage";

import {firebaseConfig} from "./firebaseConfig";

export const firebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = typeof getFirestore === "function" ? getFirestore(firebaseApp) : undefined as unknown as Firestore;
export const storage: FirebaseStorage = typeof getStorage === "function" ? getStorage(firebaseApp) : undefined as unknown as FirebaseStorage;
