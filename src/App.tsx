import React, {useState} from 'react';
import './App.css';
import './Pages/basic.css';
import {Route, Routes} from "react-router";
import {LoginPageWrapper} from "./Pages/login-page";
import {FirstPageWrapper} from "./Pages/landing-page";
import {MainContext} from "./contexts";
import {ManageDevices} from "./Pages/manage-devices";
import {ManageDevice} from "./Pages/manage-device";
import {ShowProduct} from "./Pages/show-product";
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'
import {BusinessSettingsWrapper} from "./components/business-settings";
import {CustomLinkSettingsWrapper} from "./components/custom-link-settings";
import {UploadFileSettingsWrapper} from "./components/upload-file-settings";
import {UploadVideoSettingsWrapper} from "./components/upload-video-settings";
import {UploadSongsSettingsWrapper} from "./components/upload-songs-settings";
import {SharedContacts} from "./components/shared-contacts";
import {BabyJournalSettings} from "./components/baby-journal-settings";
import {AdultJournalSettings} from "./components/adult-journal-settings";
import {AnimalTagSettingsWrapper} from "./Pages/animal-tag/animal-tag-settings";
import { SerialNumberRedirect } from './Pages/serial-number-redirect';
import { DesignSystemPreview } from "./components/design-system/DesignSystemPreview";
import {db} from "./firebase";
import { createAdminRouteElements } from "./admin/adminRoutes";

export {db, storage} from "./firebase";

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
                    <Route path={'/'} element={<FirstPageWrapper/>}/>
                    <Route path={'/app'} element={<FirstPageWrapper/>}/>
                    <Route path={'/login'} element={<LoginPageWrapper/>}/>
                    {createAdminRouteElements()}
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
