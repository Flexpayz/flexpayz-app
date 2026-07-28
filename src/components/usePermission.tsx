import {createContext, useEffect, useState} from "react";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {doc, getDoc} from "firebase/firestore";
import {db} from "../App";
import {defaultPermissions, Permissions} from "../permissions";

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
                    const productRef = doc(db, 'permissions', productId)
                    const docSnap = await getDoc(productRef);
                    console.log(docSnap, docSnap.exists(), docSnap.data())
                    if (docSnap.exists()) {
                        setPermissions((prev: Permissions) => ({...prev, ...docSnap.data() as Permissions}))
                    }
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
