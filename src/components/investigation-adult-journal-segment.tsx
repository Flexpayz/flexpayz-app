import React, {useContext} from "react";
import {Button, TextField} from "@mui/material";
import {onChangeWrapper} from "../utils";
import "./journal-segment.css"
import {DatePickerConverted} from "./date-picker-converted";
import {TimePickerConverted} from "./time-picker-converted";
import {JournalFileUpload} from "./journal-file-upload";
import {ProfileUpload} from "./profile-upload";
import {AdultJournalEditContext, InvestigationHandler} from "./adult-journal-settings";
import {DB_COLLECTIONS, DB_STORAGE} from "./baby-journal-settings";
import classNames from "classnames";
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import {MultipleInvestigationsInput} from "./home-adult-journal-segment";

interface InvestigationInputProps {
    label?: string,
    handler: InvestigationHandler,
    descriptionPlaceholder?: string,
    classname?: string,
    onDelete?: () => void
}

export function InvestigationInput({
                                       onDelete,
                                       classname,
                                       label,
                                       handler,
                                       descriptionPlaceholder = ""
                                   }: InvestigationInputProps) {
    if (!handler) return null
    return <div className={classNames("j-segment-investigation-input", classname)}>
        {label && <h4 className={"j-segment-investigation-input-label"}>{label}</h4>}
        {onDelete && <IconButton onClick={onDelete} style={{alignSelf: "end"}} aria-label="delete">
            <DeleteIcon/>
        </IconButton>}
        <TextField label={"Description"} value={handler.description.value}
                   placeholder={descriptionPlaceholder}
                   className={"j-segment-investigation-input-textfield"}
                   onChange={onChangeWrapper(handler.description)} variant={"outlined"} size={"small"} multiline
                   maxRows={5}/>
        <JournalFileUpload value={handler.assets.value} onChange={handler.assets.onChange} multiple maxFiles={5}
                           storageFolder={DB_STORAGE.ADULT_JOURNAL} storageKey={`investigation-${slugifyJournalStorageKey(label || "record")}`} label={`${label || "Investigation"} file`}/>
    </div>
}

export function InvestigationsAdultJournalSegment() {
    const {
        laboratoryTests,
        bloodTests,
        biochemistry,
        inflammatoryMarkers,
        tumorMarkers,
        hormonalProfiles,
        urineTests,
        stoolTests,
        coagulationTests,
        INR,
        xRay,
        ultrasound,
        computedTomography,
        magneticResonanceImaging,
        scintigraphy,
        upperDigestiveEndoscopy,
        colonoscopy,
        bronchoscopy,
        electrocardiogram,
        echocardiography,
        spirometry,
        stressTest,
        geneticTests,
        pcrTests,
        boneDensitometry,
    } = useContext(AdultJournalEditContext)! //TODO
    return <div className={"j-segment-container"}>
        <h1 className={"j-segment-title"}>Paraclinical Investigations</h1>
        <MultipleInvestigationsInput label={"Laboratory Tests"} handler={laboratoryTests}/>
        <MultipleInvestigationsInput label={"Blood Tests"} handler={bloodTests}/>
        <MultipleInvestigationsInput label={"Biochemistry"} handler={biochemistry}/>
        <MultipleInvestigationsInput label={"Inflammatory Markers"} handler={inflammatoryMarkers}/>
        <MultipleInvestigationsInput label={"Tumor Markers"} handler={tumorMarkers}/>
        <MultipleInvestigationsInput label={"Hormonal Profiles"} handler={hormonalProfiles}/>
        <MultipleInvestigationsInput label={"Urine Tests"} handler={urineTests}/>
        <MultipleInvestigationsInput label={"Stool Tests"} handler={stoolTests}/>
        <MultipleInvestigationsInput label={"Coagulation Tests"} handler={coagulationTests}/>
        <MultipleInvestigationsInput label={"INR"} handler={INR}/>

        <h1 className={"j-segment-title"}>High-Performance Investigations</h1>
        <MultipleInvestigationsInput label={"X-ray"} handler={xRay}/>
        <MultipleInvestigationsInput label={"Ultrasound"} handler={ultrasound}/>
        <MultipleInvestigationsInput label={"Computed Tomography (CT)"} handler={computedTomography}/>
        <MultipleInvestigationsInput label={"Magnetic Resonance Imaging (MRI)"} handler={magneticResonanceImaging}/>
        <MultipleInvestigationsInput label={"Scintigraphy"} handler={scintigraphy}/>

        <h1 className={"j-segment-title"}>Endoscopic Procedures</h1>
        <MultipleInvestigationsInput label={"Upper Digestive Endoscopy"} handler={upperDigestiveEndoscopy}/>
        <MultipleInvestigationsInput label={"Colonoscopy"} handler={colonoscopy}/>
        <MultipleInvestigationsInput label={"Bronchoscopy"} handler={bronchoscopy}/>

        <h1 className={"j-segment-title"}>Functional Tests</h1>
        <MultipleInvestigationsInput label={"Electrocardiogram (ECG)"} handler={electrocardiogram}/>
        <MultipleInvestigationsInput label={"Echocardiography"} handler={echocardiography}/>
        <MultipleInvestigationsInput label={"Spirometry"} handler={spirometry}/>
        <MultipleInvestigationsInput label={"Stress Test (Ergometry)"} handler={stressTest}/>

        <h1 className={"j-segment-title"}>Advanced Genetic and Molecular Biology</h1>
        <MultipleInvestigationsInput label={"Genetic Tests"} handler={geneticTests}/>
        <MultipleInvestigationsInput label={"PCR Tests"} handler={pcrTests}/>
        <MultipleInvestigationsInput label={"Bone Densitometry (DEXA)"} handler={boneDensitometry}/>

    </div>
}

function slugifyJournalStorageKey(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "record";
}
