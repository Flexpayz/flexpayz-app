import React, {useState} from 'react';
import './App.css';
import './Pages/basic.css';
import {Route, Routes} from "react-router";
import {LoginPage, FirstPageWrapper} from "./Pages/login-page";
import {LoginFormContext, MainContext, RegisterFormContext} from "./contexts";
import {InitialPage} from "./Pages/initial-page";
import {initializeApp} from 'firebase/app';
import {getFirestore} from "firebase/firestore";
import {AdminPage} from "./Pages/admin";
import {ManageDevices} from "./Pages/manage-devices";
import {ManageDevice} from "./Pages/manage-device";
import {getStorage, ref} from "firebase/storage";
import {ShowProduct} from "./Pages/show-product";
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'
import {BusinessSettings, BusinessSettingsWrapper} from "./components/business-settings";
import {CustomLinkSettings, CustomLinkSettingsWrapper} from "./components/custom-link-settings";
import {UploadFileSettings, UploadFileSettingsWrapper} from "./components/upload-file-settings";
import {UploadVideoSettings, UploadVideoSettingsWrapper} from "./components/upload-video-settings";
import {UploadSongsSettings, UploadSongsSettingsWrapper} from "./components/upload-songs-settings";
import {SharedContacts} from "./components/shared-contacts";
import {BabyJournalSettings} from "./components/baby-journal-settings";
import {AdultJournalSettings} from "./components/adult-journal-settings";
import {AnimalTagSettingsWrapper} from "./Pages/animal-tag/animal-tag-settings";
import { SerialNumberRedirect } from './Pages/serial-number-redirect';
import GetUnlockCode from "./Pages/GetUnlockCode";
import { SerialProductMigrationPage } from "./Pages/serial-product-migration";
import { DesignSystemPreview } from "./components/design-system/DesignSystemPreview";

const firebaseConfig = {
    apiKey: "AIzaSyD95KPFA7TG3QepgOl8iJdUM3c9RnEM11Q",
    authDomain: "bussiness-card-bda7f.firebaseapp.com",
    projectId: "bussiness-card-bda7f",
    storageBucket: "bussiness-card-bda7f.appspot.com",
    messagingSenderId: "788931798027",
    appId: "1:788931798027:web:54941df048478186d7930e"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app)


const defaultState: any = {
    login: {email: "", password: ""},
    register: {email: "", password: "", confirmPassword: "", country: ""},
    userId: "",
    invalidFields: new Map()
}

function App() {
    const [state, setState] = useState(defaultState)
    const showDesignSystemPreview = process.env.NODE_ENV === "development" && window.location.pathname === "/__design-system";

    if (showDesignSystemPreview) {
        return <DesignSystemPreview />;
    }

    return (
        <div className="App">
            <MainContext.Provider value={{state, setState, db}}>
                <Routes>
                    <Route path={'/'} element={<InitialPage/>}/>
                    <Route path={'/app'} element={<FirstPageWrapper/>}/>
                    <Route path={'/admin'} element={<AdminPage/>}/>
                    <Route path={'/admin/unlock-code'} element={<GetUnlockCode/>}/>
                    <Route path={'/admin/serial-migration'} element={<SerialProductMigrationPage/>}/>
                    <Route path={'/manage-devices'} element={<ManageDevices/>}/>
                    <Route path={'/manage-device'} element={<ManageDevice/>}/>
                    <Route path={'/manage-device/business-card'} element={<BusinessSettingsWrapper/>}/>
                    <Route path={'/manage-device/custom-link'} element={<CustomLinkSettingsWrapper/>}/>
                    <Route path={'/manage-device/upload-files'} element={<UploadFileSettingsWrapper/>}/>
                    <Route path={'/manage-device/upload-video'} element={<UploadVideoSettingsWrapper/>}/>
                    <Route path={'/manage-device/upload-songs'} element={<UploadSongsSettingsWrapper/>}/>
                    <Route path={'/manage-device/shared-contacts'} element={<SharedContacts/>}/>
                    <Route path={'/manage-device/baby-journal'} element={<BabyJournalSettings/>}/>
                    <Route path={'/manage-device/adult-journal'} element={<AdultJournalSettings/>}/>
                    <Route path={'/manage-device/animal-tag'} element={<AnimalTagSettingsWrapper/>}/>
                    <Route path={'/redirect'} element={<SerialNumberRedirect/>}/>

                    <Route path={'/show-product'} element={<ShowProduct/>}/>
                </Routes>
            </MainContext.Provider>
            <ToastContainer />
        </div>
    );
}

export default App;
