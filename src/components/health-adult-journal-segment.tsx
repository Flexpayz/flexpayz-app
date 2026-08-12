import React, {useContext} from "react";
import {TextField} from "@mui/material";
import {onChangeWrapper} from "../utils";
import "./journal-segment.css"
import {JournalFileUpload} from "./journal-file-upload";
import {AdultJournalEditContext} from "./adult-journal-settings";
import {DB_STORAGE} from "./baby-journal-settings";
import {MultipleVitalSignsInput} from "./home-adult-journal-segment";

export function HealthAdultJournalSegment() {
    const {
        previousConditions,
        medication,
        allergies,
        familyHistory,
        vitalSigns,
        generalPhysicalExamination,
        europeanHealthCard
    } = useContext(AdultJournalEditContext)! //TODO
    return <div className={"j-segment-container"}>
        <h1 className={"j-segment-title"}>Medical History</h1>
        <TextField label={'Previous Conditions'} placeholder={"Previous Conditions"} value={previousConditions.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(previousConditions)} variant={"outlined"} size={"small"} multiline
                   minRows={3}
                   maxRows={7}
        />
        <TextField label={'Medication'} placeholder={"Medication"} value={medication.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(medication)} variant={"outlined"} size={"small"} multiline minRows={3}
                   maxRows={7}
        />
        <TextField label={'Allergies'} placeholder={"Allergies"} value={allergies.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(allergies)} variant={"outlined"} size={"small"} multiline minRows={3}
                   maxRows={7}
        />
        <TextField label={'Family History'} placeholder={"Family History"} value={familyHistory.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(familyHistory)} variant={"outlined"} size={"small"} multiline minRows={3}
                   maxRows={7}
        />

        <h1 className={"j-preview-title"}>European Health Card</h1>
        <JournalFileUpload value={europeanHealthCard.value} onChange={europeanHealthCard.onChange} storageFolder={DB_STORAGE.ADULT_JOURNAL} storageKey="european-health-card" label="European Health Card"/>

        <h1 className={"j-segment-title"}>Clinical Examination</h1>
        <TextField label={'General Physical Examination'} placeholder={"General Physical Examination"}
                   value={generalPhysicalExamination.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(generalPhysicalExamination)} variant={"outlined"} size={"small"} multiline
                   minRows={3}
                   maxRows={7}
        />

        <h3 className={"j-segment-subtitle"}>Vital Signs</h3>
        <MultipleVitalSignsInput handler={vitalSigns}/>

    </div>
}
