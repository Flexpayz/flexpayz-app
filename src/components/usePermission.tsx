import {createContext, useEffect, useState} from "react";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {defaultPermissions, Permissions} from "../permissions";
import {getPermissions} from "../firestore/repositories/permissions";

export {defaultPermissions};
export type {Permissions};

export function usePermission(): Permissions {
    const [permissions, setPermissions] = useState<Permissions>(defaultPermissions)

    useEffect(() => {
            (async () => {
                const auth = getAuth();
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                    } else {
                        // navigate('/app')
                    }
                });
                const urlParams = new URLSearchParams(window.location.search)
                const productId = urlParams.get('product_id')
                if (productId) {
                    setPermissions(await getPermissions(productId))
                }
            })()
            // notify(`Don't forget to save after changes`)
        }, []
    );
    return permissions
}

export const PermissionContext = createContext<Permissions>(defaultPermissions)

export function PermissionContextProvider({children}: { children: any }) {
    const value = usePermission()
    return <PermissionContext.Provider value={value}>
        {children}
    </PermissionContext.Provider>
}
