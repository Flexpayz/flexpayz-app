import "./loading-screen.css"
import {createContext} from "react";
import {LoadingPanel} from "./design-system";

export function LoadingScreen({text = "Loading workspace"}: {text?: string}) {
    return <div className={"loading-screen-container"}>
        <LoadingPanel text={text}/>
    </div>
}

interface LoadingContextType {
    isLoading: boolean,
    setIsLoading: any
}

export const LoadingScreenContext = createContext<LoadingContextType>({
    isLoading: false, setIsLoading: () => {
    }
})
