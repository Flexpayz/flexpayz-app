import {AnimalTagConfig, defaultAnimalTagConfig} from "./config";
import {createContext, useContext, useEffect, useState} from "react";
import {LoadingScreenContext} from "../../components/loading-sreen";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {getAnimalTag} from "../../firestore/repositories/animalTags";

export interface AnimalTagInformation {
    state: AnimalTagConfig,
    setState: React.Dispatch<React.SetStateAction<AnimalTagConfig>>
    originalState: AnimalTagConfig,
    setOriginalState: React.Dispatch<React.SetStateAction<AnimalTagConfig>>
}

function useAnimalTagInformation(): AnimalTagInformation {
    const [state, setState] = useState<AnimalTagConfig>(defaultAnimalTagConfig)
    const [originalState, setOriginalState] = useState<AnimalTagConfig>(defaultAnimalTagConfig)

    const {setIsLoading} = useContext(LoadingScreenContext)

    useEffect(() => {
            (async () => {
                setIsLoading(true)
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
                    const normalized = await getAnimalTag(productId)
                    setState(normalized as AnimalTagConfig)
                    setOriginalState(normalized as AnimalTagConfig)
                }
                setIsLoading(false)
            })()
            // notify(`Don't forget to save after changes`)
        }, []
    );

    return {state, setState, originalState, setOriginalState}
}

export const AnimalTagInformationContext = createContext<AnimalTagInformation>({
    state: defaultAnimalTagConfig,
    originalState: defaultAnimalTagConfig,
    setState: () => {
    },
    setOriginalState: () => {
    }
})

export function AnimalTagInformationContextProvider({children}: any) {
    const value = useAnimalTagInformation()
    if (!value) return null
    return <AnimalTagInformationContext.Provider value={value}>{children}</AnimalTagInformationContext.Provider>
}
