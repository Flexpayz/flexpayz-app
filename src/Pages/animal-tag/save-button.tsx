import {getProductIdFromURL} from "../../utils";
import {notify} from "../login-page";
import {DB_COLLECTIONS} from "../../components/baby-journal-settings";
import "./save-button.css"
import {updateAnimalTag} from "../../firestore/repositories/animalTags";

interface SaveButtonProps {
    state: any,
    setOriginalState: any,
    collection: DB_COLLECTIONS
}

export function SaveButton({collection, setOriginalState, state}: SaveButtonProps) {
    const productId = getProductIdFromURL()
    const onSave = async () => {
        if (productId) {
            if (collection === DB_COLLECTIONS.ANIMAL_TAG) {
                await updateAnimalTag(productId, state)
            }
            notify('Saved modifications')
            setOriginalState(state)
        }
    }

    return <div className={"save-button-wrapper"} onClick={onSave}>
        SAVE
    </div>
}
