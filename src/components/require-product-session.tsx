import {useEffect, useState} from "react";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {Navigate, Outlet, useLocation} from "react-router";
import {firebaseApp} from "../firebase";
import {createLoginPath, getRequestedPath} from "../admin/returnTo";
import {LoadingPanel} from "./design-system/LoadingPanel";

export function RequireProductSession() {
    // Undefined means Firebase has not finished restoring the browser session.
    const [userId, setUserId] = useState<string | null | undefined>(undefined);
    const location = useLocation();

    useEffect(() => onAuthStateChanged(
        getAuth(firebaseApp),
        (user) => setUserId(user?.uid ?? null),
        (error) => {
            const code = (error as {code?: unknown}).code;
            console.error("[FlexPayz auth] Session restoration failed", {errorCode: typeof code === "string" ? code : "unknown"});
            setUserId(null);
        },
    ), []);

    if (userId === undefined) return <LoadingPanel text="Restoring your session"/>;
    if (userId === null) return <Navigate to={createLoginPath(getRequestedPath(location))} replace/>;
    return <Outlet key={userId}/>;
}
