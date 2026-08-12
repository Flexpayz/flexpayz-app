import React, {useContext} from "react";
import {TextField} from "@mui/material";
import {onChangeWrapper} from "../utils";
import {BabyJournalEditContext, DB_STORAGE} from "./baby-journal-settings";
import "./journal-segment.css"
import {JournalFileUpload} from "./journal-file-upload";
import {ProfileUpload} from "./profile-upload";
import {MultipleInvestigationsInput} from "./home-adult-journal-segment";

export function HealthJournalSegment() {
    const {
        mother,
        father,
        healthProblems,
        vaccines,
        allergies,
        medication,
        chronicAversions,
        otherHealthConditions,
        medicalRecords,
        europeanHealthCard,
    } = useContext(BabyJournalEditContext)! //TODO
    return <div className={"j-segment-container"}>
        <h1 className={"j-segment-title"}>Medical Records</h1>
        <JournalFileUpload value={medicalRecords.value} onChange={medicalRecords.onChange} multiple maxFiles={10}
                           storageFolder={DB_STORAGE.BABY_JOURNAL} storageKey="medical-record" label="Medical record"/>

        <h1 className={"j-segment-title"}>Allergies, Health Info, Vaccines</h1>
        <MultipleInvestigationsInput label={"Health Problems"} handler={healthProblems}/>
        <MultipleInvestigationsInput label={"Vaccines"} handler={vaccines}/>
        <MultipleInvestigationsInput label={"Allergies"} handler={allergies}/>
        <MultipleInvestigationsInput label={"Medication"} handler={medication}/>
        <MultipleInvestigationsInput label={"Chronic Aversions"} handler={chronicAversions}/>

        <TextField label={'Other'} placeholder={"Other"} value={otherHealthConditions.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(otherHealthConditions)} variant={"outlined"} size={"small"} multiline
                   minRows={3}
                   maxRows={7}
        />

        <h1 className={"j-preview-title"}>European Health Card</h1>
        <JournalFileUpload value={europeanHealthCard.value} onChange={europeanHealthCard.onChange}
                           storageFolder={DB_STORAGE.BABY_JOURNAL} storageKey="european-health-card" label="European Health Card"/>

        <h1 className={"j-segment-title"}>Mom</h1>
        <ProfileUpload value={mother.profilePicture.value} onChange={mother.profilePicture.onChange}
                       storageFolder={DB_STORAGE.BABY_JOURNAL}/>
        <TextField label={'Full name'} value={mother.name.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(mother.name)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Allergies'} value={mother.allergies.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(mother.allergies)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Diseases'} value={mother.diseases.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(mother.diseases)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Chronic Adverse Reaction'} value={mother.chronicAversions.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(mother.chronicAversions)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Blood Type'} value={mother.bloodType.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(mother.bloodType)} variant={"outlined"} size={"small"}
        />

        <h1 className={"j-segment-title"}>Dad</h1>
        <ProfileUpload value={father.profilePicture.value} onChange={father.profilePicture.onChange}
                       storageFolder={DB_STORAGE.BABY_JOURNAL}/>
        <TextField label={'Full name'} value={father.name.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(father.name)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Allergies'} value={father.allergies.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(father.allergies)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Diseases'} value={father.diseases.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(father.diseases)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Chronic Adverse Reaction'} value={father.chronicAversions.value}
                   className={"j-segment-textfield"}
                   onChange={onChangeWrapper(father.chronicAversions)} variant={"outlined"} size={"small"}
        />
        <TextField label={'Blood Type'} value={father.bloodType.value} className={"j-segment-textfield"}
                   onChange={onChangeWrapper(father.bloodType)} variant={"outlined"} size={"small"}
        />
    </div>
}
