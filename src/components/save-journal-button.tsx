import {useContext} from "react";
import {getProductIdFromURL} from "../utils";
import {notify} from "../Pages/login-page";
import {BabyJournalStateContext, DB_COLLECTIONS} from "./baby-journal-settings";
import "./save-journal-button.css"
import {AdultJournalStateContext, ModificationJournalContext} from "./adult-journal-settings";
import {updateAdultJournal, updateBabyJournal} from "../firestore/repositories/journals";

interface SaveJournalButtonProps {
    collection: DB_COLLECTIONS
}

export function SaveJournalButton({collection}: SaveJournalButtonProps) {
    const {babyJournalState, setOriginalBabyJournalState} = useContext(BabyJournalStateContext)
    const {adultJournalState, setOriginalJournalState: setOriginalAdultState} = useContext(AdultJournalStateContext)
    const productId = getProductIdFromURL()


    const actualState = collection === DB_COLLECTIONS.BABY_JOURNALS ? babyJournalState : adultJournalState
    const onSave = async () => {
        if (productId) {
            if (collection === DB_COLLECTIONS.BABY_JOURNALS) {
                await updateBabyJournal(productId, {...actualState})
            } else {
                await updateAdultJournal(productId, {...actualState})
            }
            notify('Saved modifications')
            if (collection === DB_COLLECTIONS.BABY_JOURNALS) {
                setOriginalBabyJournalState(babyJournalState)
            } else {
                setOriginalAdultState(adultJournalState)
            }
        }
    }
    return <div className={"save-journal-wrapper"} onClick={onSave}>
        SAVE
    </div>
}
