import {initializeApp} from "firebase/app";
import {Firestore, getFirestore} from "firebase/firestore";
import {FirebaseStorage, getStorage} from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyD95KPFA7TG3QepgOl8iJdUM3c9RnEM11Q",
    authDomain: "bussiness-card-bda7f.firebaseapp.com",
    projectId: "bussiness-card-bda7f",
    storageBucket: "bussiness-card-bda7f.appspot.com",
    messagingSenderId: "788931798027",
    appId: "1:788931798027:web:54941df048478186d7930e",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = typeof getFirestore === "function" ? getFirestore(firebaseApp) : undefined as unknown as Firestore;
export const storage: FirebaseStorage = typeof getStorage === "function" ? getStorage(firebaseApp) : undefined as unknown as FirebaseStorage;
