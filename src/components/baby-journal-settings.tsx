import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {notify} from "../Pages/login-page";
import {getProductIdFromURL} from "../utils";
import {LoadingScreenContext} from "./loading-sreen";
import {Dialog, DialogActions, DialogContent, DialogTitle} from "@mui/material";
import {
    defaultMultipleInvestigations,
    InvestigationHandler,
    MultipleInvestigations,
    MultipleInvestigationsHandler,
    MultipleSleepScheduleHandler,
    useCreateMultipleSleepScheduleHandler
} from "./adult-journal-settings";
import {useNavigate} from "react-router";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {BackButton, FlexPayzLogo, LoadingPanel} from "./design-system";
import {ProfileUpload} from "./profile-upload";
import {JournalFileUpload} from "./journal-file-upload";
import {
    babyFeedingFields,
    babyMilestones,
    buildBabyJournalUpdate,
    deriveBabyAgeLabel,
    emptyBabyJournalInformation,
    formatJournalDate,
    getBabyJournalCompletion,
    getDatedMilestones,
    getLatestSleepEntry,
    hasBabyJournalChanges,
    healthCategories,
    sortJournalDateKeysNewestFirst,
} from "../baby-journal";
import {DB_COLLECTIONS} from "../firestore/collections";
import {getBabyJournal, updateBabyJournal} from "../firestore/repositories/journals";

// import {InvestigationsJournalSegment} from "./investigations-journal-segment";

export {DB_COLLECTIONS};

export enum DB_STORAGE {
    BABY_JOURNAL = 'baby_journal',
    ADULT_JOURNAL = 'adult_journal',
    ANIMAL_TAG = 'animal_tag',
}

export interface Asset {
    name: string,
    url: string
}

interface Investigation {
    name: string,
    details: string,
    assets: Asset[]
}

export interface SleepSchedule {
    daySleeping: string,
    nightSleeping: string,
    waysOfSleeping: string,
    nightSleepingProgress: string,
}

export interface MultipleSleepSchedule {
    [key: string]: SleepSchedule
}

export interface BabyJournalInformation {
    name: string,
    gender: string,
    birthDate: string,
    timeOfBirth: string,
    apgar: string,
    weightOnBirth: string,
    heightOnBirth: string,
    placeOfBirth: string,
    biography: string,
    firstHeadHold: string,
    firstRoll: string,
    firstSit: string,
    firstSteps: string,
    firstRun: string,
    firstBreastfeeding: string,
    firstFormula: string,
    introductionOfCereal: string,
    firstSolidFeeding: string,
    foodPreferences: string,
    foodAversions: string,
    sleepSchedule: MultipleSleepSchedule
    // daySleeping: string,
    // nightSleeping: string,
    // waysOfSleeping: string,
    // nightSleepingProgress: string,
    mother: {
        profilePicture: Asset[]
        name: string,
        allergies: string,
        diseases: string,
        chronicAversions: string,
        bloodType: string
    },
    father: {
        profilePicture: Asset[]
        name: string,
        allergies: string,
        diseases: string,
        chronicAversions: string,
        bloodType: string
    },
    healthProblems: MultipleInvestigations,
    vaccines: MultipleInvestigations,
    allergies: MultipleInvestigations,
    medication: MultipleInvestigations,
    chronicAversions: MultipleInvestigations,
    otherHealthConditions: string,
    medicalRecords: Asset[],
    profilePicture: Asset[],
    bloodType: string,
    europeanHealthCard: Asset[],

    // investigations: Investigation[]
}

interface useBabyJournalEditInterface {
    name: EditContext<string>,
    gender: EditContext<string>,
    birthDate: EditContext<string>,
    timeOfBirth: EditContext<string>
    apgar: EditContext<string>,
    weightOnBirth: EditContext<string>,
    heightOnBirth: EditContext<string>,
    placeOfBirth: EditContext<string>,
    biography: EditContext<string>,
    firstHeadHold: EditContext<string>,
    firstRoll: EditContext<string>,
    firstSit: EditContext<string>,
    firstSteps: EditContext<string>,
    firstRun: EditContext<string>,
    firstBreastfeeding: EditContext<string>,
    firstFormula: EditContext<string>,
    introductionOfCereal: EditContext<string>,
    firstSolidFeeding: EditContext<string>,
    foodPreferences: EditContext<string>,
    foodAversions: EditContext<string>,
    // daySleeping: EditContext<string>,
    // nightSleeping: EditContext<string>,
    // waysOfSleeping: EditContext<string>,
    // nightSleepingProgress: EditContext<string>,
    sleepSchedule: MultipleSleepScheduleHandler
    // investigations: any,
    mother: {
        profilePicture: EditContext<Asset[]>
        name: EditContext<string>,
        allergies: EditContext<string>,
        diseases: EditContext<string>,
        chronicAversions: EditContext<string>,
        bloodType: EditContext<string>,
    },
    father: {
        profilePicture: EditContext<Asset[]>
        name: EditContext<string>,
        allergies: EditContext<string>,
        diseases: EditContext<string>,
        chronicAversions: EditContext<string>,
        bloodType: EditContext<string>
    },
    healthProblems: MultipleInvestigationsHandler,
    vaccines: MultipleInvestigationsHandler,
    allergies: MultipleInvestigationsHandler,
    medication: MultipleInvestigationsHandler,
    chronicAversions: MultipleInvestigationsHandler,
    otherHealthConditions: EditContext<string>,
    medicalRecords: EditContext<Asset[]>,
    profilePicture: EditContext<Asset[]>,
    bloodType: EditContext<string>,
    europeanHealthCard: EditContext<Asset[]>

}

export function BabyJournalSettings() {
    const [isLoading, setIsLoading] = useState(false)
    return <div className="baby-journal-editor-shell">
        <LoadingScreenContext.Provider value={{isLoading, setIsLoading}}>
            <BabyJournalStateContextProvider>
                {isLoading && <BabyJournalEditorLoading/>}
                {!isLoading && <BabyJournalWorkspace/>}
            </BabyJournalStateContextProvider>
        </LoadingScreenContext.Provider>
    </div>
}

const defaultInvestigation: Investigation = {
    name: "",
    details: "",
    assets: []
}

export const defaultInformation: BabyJournalInformation = {
    name: "",
    gender: "",
    birthDate: "",
    timeOfBirth: "",
    apgar: "",
    weightOnBirth: "",
    heightOnBirth: "",
    placeOfBirth: "",
    biography: "",
    firstHeadHold: "",
    firstRoll: "",
    firstSit: "",
    firstSteps: "",
    firstRun: "",
    firstBreastfeeding: "",
    firstFormula: "",
    introductionOfCereal: "",
    firstSolidFeeding: "",
    foodPreferences: "",
    foodAversions: "",
    sleepSchedule: {},
    // daySleeping: "",
    // nightSleeping: "",
    // waysOfSleeping: "",
    // nightSleepingProgress: "",
    // investigations: [defaultInvestigation],
    mother: {
        profilePicture: [],
        name: "",
        allergies: "",
        diseases: "",
        chronicAversions: "",
        bloodType: ""
    },
    father: {
        profilePicture: [],
        name: "",
        allergies: "",
        diseases: "",
        chronicAversions: "",
        bloodType: ""
    },
    healthProblems: defaultMultipleInvestigations,
    vaccines: defaultMultipleInvestigations,
    allergies: defaultMultipleInvestigations,
    medication: defaultMultipleInvestigations,
    chronicAversions: defaultMultipleInvestigations,
    otherHealthConditions: "",
    medicalRecords: [],
    profilePicture: [],
    bloodType: "",
    europeanHealthCard: [],
}

interface UseBabyJournalInformationValue {
    babyJournalState: BabyJournalInformation,
    setBabyJournalState: any,
    originalBabyJournalState: BabyJournalInformation,
    setOriginalBabyJournalState: any,
}

export function useBabyJournalInformation(): UseBabyJournalInformationValue {

    const [babyJournalState, setBabyJournalState] = useState<BabyJournalInformation>(emptyBabyJournalInformation)
    const [originalBabyJournalState, setOriginalBabyJournalState] = useState<BabyJournalInformation>(emptyBabyJournalInformation)
    const {setIsLoading} = useContext(LoadingScreenContext)

    useEffect(() => {
            (async () => {
                setIsLoading(true)
                const urlParams = new URLSearchParams(window.location.search)
                const productId = urlParams.get('product_id')
                if (productId) {
                    const normalized = await getBabyJournal(productId)
                    setBabyJournalState(normalized)
                    setOriginalBabyJournalState(normalized)
                }
                setIsLoading(false)
            })()
            // notify(`Don't forget to save after changes`)
        }, [setIsLoading]
    );
    return {babyJournalState, setBabyJournalState, originalBabyJournalState, setOriginalBabyJournalState}
}

type BabyJournalEditorTab = "home" | "health";
type BabyJournalSaveState = "clean" | "dirty" | "saving" | "saved" | "failed";

function BabyJournalEditorLoading() {
    return (
        <div className="baby-journal-editor-state">
            <LoadingPanel text="Loading baby journal workspace"/>
        </div>
    );
}

function BabyJournalWorkspace() {
    const navigate = useNavigate();
    const productId = getProductIdFromURL();
    const {babyJournalState, setBabyJournalState, originalBabyJournalState, setOriginalBabyJournalState} = useContext(BabyJournalStateContext);
    const [activeTab, setActiveTab] = useState<BabyJournalEditorTab>("home");
    const [saveState, setSaveState] = useState<BabyJournalSaveState>("clean");
    const [saveMessage, setSaveMessage] = useState("No unsaved changes");
    const headingRef = useRef<HTMLHeadingElement | null>(null);

    const completion = useMemo(() => getBabyJournalCompletion(babyJournalState), [babyJournalState]);
    const dirty = useMemo(() => hasBabyJournalChanges(babyJournalState, originalBabyJournalState), [babyJournalState, originalBabyJournalState]);
    const latestSleep = useMemo(() => getLatestSleepEntry(babyJournalState.sleepSchedule), [babyJournalState.sleepSchedule]);
    const milestones = useMemo(() => getDatedMilestones(babyJournalState), [babyJournalState]);

    useEffect(() => {
        if (saveState !== "saving" && saveState !== "failed") {
            setSaveState(dirty ? "dirty" : "clean");
            setSaveMessage(dirty ? "Unsaved changes" : "No unsaved changes");
        }
    }, [dirty, saveState]);

    useEffect(() => {
        headingRef.current?.focus();
    }, [activeTab]);

    const updateField = <K extends keyof BabyJournalInformation>(field: K, value: BabyJournalInformation[K]) => {
        setBabyJournalState((previous: BabyJournalInformation) => ({...previous, [field]: value}));
    };

    const updateSleepEntry = (dateKey: string, field: keyof SleepSchedule, value: string) => {
        setBabyJournalState((previous: BabyJournalInformation) => ({
            ...previous,
            sleepSchedule: {
                ...previous.sleepSchedule,
                [dateKey]: {
                    ...(previous.sleepSchedule[dateKey] || {daySleeping: "", nightSleeping: "", waysOfSleeping: "", nightSleepingProgress: ""}),
                    [field]: value,
                },
            },
        }));
    };

    const addSleepEntry = () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        setBabyJournalState((previous: BabyJournalInformation) => ({
            ...previous,
            sleepSchedule: {
                ...previous.sleepSchedule,
                [dateKey]: previous.sleepSchedule[dateKey] || {daySleeping: "", nightSleeping: "", waysOfSleeping: "", nightSleepingProgress: ""},
            },
        }));
    };

    const saveJournal = async () => {
        if (!productId || saveState === "saving") return;
        const updates = buildBabyJournalUpdate(babyJournalState, originalBabyJournalState);
        if (Object.keys(updates).length === 0) {
            setSaveState("clean");
            setSaveMessage("No changes to save");
            return;
        }
        setSaveState("saving");
        setSaveMessage("Saving journal…");
        try {
            await updateBabyJournal(productId, updates);
            setOriginalBabyJournalState(babyJournalState);
            setSaveState("saved");
            setSaveMessage("Changes saved");
            notify("Baby Journal saved");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your changes are still here.");
            notify("Baby Journal could not be saved");
        }
    };

    const goBack = () => {
        navigate(`/manage-device?product_id=${productId || ""}`);
    };

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        element?.scrollIntoView({behavior: "smooth", block: "start"});
        if (element instanceof HTMLElement) element.focus({preventScroll: true});
    };

    return (
        <main className="baby-journal-editor-layout" aria-label="Baby Journal editor">
            <aside className="baby-journal-editor-sidebar" aria-label="Journal navigation">
                <FlexPayzLogo className="baby-journal-editor-logo"/>
                <BabyJournalIdentity journal={babyJournalState} completion={completion}/>
                <nav className="baby-journal-editor-tabs" aria-label="Baby Journal sections">
                    <button type="button" className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>⌂ Home</button>
                    <button type="button" className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}>♡ Health</button>
                </nav>
                <div className="baby-journal-editor-section-links">
                    {(activeTab === "home" ? homeSectionLinks : healthSectionLinks).map((link) => (
                        <button key={link.id} type="button" onClick={() => scrollToSection(link.id)}>{link.label}</button>
                    ))}
                </div>
                <div className={`baby-journal-editor-status-card ${saveState}`}>
                    <strong>{saveState === "saving" ? "Saving" : saveState === "failed" ? "Needs retry" : saveState === "saved" ? "Saved" : "Autosave off"}</strong>
                    <span>{saveMessage}</span>
                </div>
            </aside>

            <section className="baby-journal-editor-main">
                <header className="baby-journal-editor-header">
                    <div className="baby-journal-editor-topbar">
                        <FlexPayzLogo className="baby-journal-editor-header-logo"/>
                        <BackButton aria-label="Back to device workspace" onClick={goBack}/>
                    </div>
                    <div className="baby-journal-editor-title">
                        <p className="business-kicker">BABY JOURNAL SETTINGS</p>
                        <h1 ref={headingRef} tabIndex={-1}>{activeTab === "home" ? "A clear record of every chapter" : "Health records, kept readable"}</h1>
                        <p>{activeTab === "home" ? "Complete one meaningful section at a time. Health information stays in its own workspace." : "Review private health records, medical files and parent profiles without changing the data model."}</p>
                    </div>
                    <BabyJournalCompletion completion={completion}/>
                    <nav className="baby-journal-mobile-tabs" role="tablist" aria-label="Baby Journal sections">
                        <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>⌂ Home</button>
                        <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}>♡ Health</button>
                    </nav>
                </header>

                <div className="baby-journal-editor-content">
                    {activeTab === "home" ? (
                        <BabyJournalHomeEditor
                            journal={babyJournalState}
                            updateField={updateField}
                            updateSleepEntry={updateSleepEntry}
                            addSleepEntry={addSleepEntry}
                            latestSleep={latestSleep}
                            milestones={milestones}
                        />
                    ) : (
                        <BabyJournalHealthEditor journal={babyJournalState} setJournal={setBabyJournalState}/>
                    )}
                </div>

                <footer className="baby-journal-savebar" aria-live="polite">
                    <span>{saveMessage}</span>
                    <button type="button" className="baby-journal-button primary" disabled={!dirty || saveState === "saving"} onClick={saveJournal}>
                        {saveState === "saving" ? "Saving…" : "Save journal"} →
                    </button>
                </footer>
            </section>
        </main>
    );
}

function BabyJournalCompletion({completion}: {completion: number}) {
    return (
        <section className="baby-journal-completion-card" aria-label="Journal completion">
            <div>
                <CheckRoundedIcon/>
                <strong>Journal progress</strong>
                <span>Complete the essentials</span>
            </div>
            <div className="baby-journal-completion-meter" aria-hidden="true"><i style={{transform: `scaleX(${completion / 100})`}}/></div>
            <strong>{completion}%</strong>
        </section>
    );
}

const homeSectionLinks = [
    {id: "baby-profile-birth", label: "Profile & birth"},
    {id: "baby-biography", label: "Biography"},
    {id: "baby-milestones", label: "Milestones"},
    {id: "baby-feeding", label: "Feeding"},
    {id: "baby-sleep", label: "Sleep schedule"},
];

const healthSectionLinks = [
    {id: "baby-health-summary", label: "Summary"},
    {id: "baby-health-records", label: "Medical records"},
    {id: "baby-health-categories", label: "Health categories"},
    {id: "baby-parent-profiles", label: "Parent profiles"},
];

function BabyJournalIdentity({journal, completion}: {journal: BabyJournalInformation; completion: number}) {
    const photo = journal.profilePicture[0];
    return (
        <div className="baby-journal-editor-identity">
            {photo ? <img src={photo.url} alt="" aria-hidden="true"/> : <span aria-hidden="true">⌒</span>}
            <p>{journal.name || "Baby Journal"}</p>
            <strong>{journal.name || "Unnamed child"}</strong>
            <small>{formatJournalDate(journal.birthDate, "Birth date not set")} · {deriveBabyAgeLabel(journal.birthDate) || "age pending"}</small>
            <em>{completion}% complete</em>
        </div>
    );
}

function BabyJournalHomeEditor({
    journal,
    updateField,
    updateSleepEntry,
    addSleepEntry,
    latestSleep,
    milestones,
}: {
    journal: BabyJournalInformation;
    updateField: <K extends keyof BabyJournalInformation>(field: K, value: BabyJournalInformation[K]) => void;
    updateSleepEntry: (dateKey: string, field: keyof SleepSchedule, value: string) => void;
    addSleepEntry: () => void;
    latestSleep: {dateKey: string; value: SleepSchedule} | null;
    milestones: ReturnType<typeof getDatedMilestones>;
}) {
    return (
        <>
            <EditorCard id="baby-profile-birth" kicker="01 · PROFILE & BIRTH" title="Profile and birth data">
                <div className="baby-journal-profile-row">
                    <ProfileUpload value={journal.profilePicture} onChange={(profilePicture) => updateField("profilePicture", profilePicture)} storageFolder={DB_STORAGE.BABY_JOURNAL}/>
                    <div className="baby-journal-field-grid">
                        <BabyField label="Full name" value={journal.name} onChange={(value) => updateField("name", value)}/>
                        <BabyField label="Gender" value={journal.gender} onChange={(value) => updateField("gender", value)}/>
                        <BabyField label="Birth date" value={journal.birthDate} onChange={(value) => updateField("birthDate", value)}/>
                        <BabyField label="Blood type" value={journal.bloodType} onChange={(value) => updateField("bloodType", value)}/>
                        <BabyField label="Time of birth" value={journal.timeOfBirth} onChange={(value) => updateField("timeOfBirth", value)}/>
                        <BabyField label="APGAR" value={journal.apgar} onChange={(value) => updateField("apgar", value)}/>
                        <BabyField label="Birth weight" value={journal.weightOnBirth} onChange={(value) => updateField("weightOnBirth", value)}/>
                        <BabyField label="Birth height" value={journal.heightOnBirth} onChange={(value) => updateField("heightOnBirth", value)}/>
                        <BabyField label="Place of birth" value={journal.placeOfBirth} onChange={(value) => updateField("placeOfBirth", value)}/>
                    </div>
                </div>
            </EditorCard>

            <EditorCard id="baby-biography" kicker="02 · BIOGRAPHY" title="Child biography">
                <BabyTextArea label="Biography" value={journal.biography} onChange={(value) => updateField("biography", value)} rows={5}/>
            </EditorCard>

            <EditorCard id="baby-milestones" kicker="03 · PHYSICAL MILESTONES" title="Milestones">
                <div className="baby-journal-two-column">
                    <div className="baby-journal-field-grid">
                        {babyMilestones.map((milestone) => (
                            <BabyField key={milestone.field} label={milestone.label} value={journal[milestone.field]} onChange={(value) => updateField(milestone.field, value)}/>
                        ))}
                    </div>
                    <div className="baby-journal-timeline" aria-label="Dated milestone summary">
                        {milestones.length > 0 ? milestones.map((milestone) => (
                            <div key={milestone.field}>
                                <strong>{milestone.label}</strong>
                                <span>{formatJournalDate(milestone.value)}</span>
                            </div>
                        )) : <p>No milestones dated yet.</p>}
                    </div>
                </div>
            </EditorCard>

            <EditorCard id="baby-feeding" kicker="04 · FEEDING" title="Feeding">
                <div className="baby-journal-field-grid">
                    {babyFeedingFields.map((field) => (
                        <BabyField key={field.field} label={field.label} value={journal[field.field]} onChange={(value) => updateField(field.field, value)}/>
                    ))}
                </div>
            </EditorCard>

            <EditorCard id="baby-sleep" kicker="05 · SLEEP SCHEDULE" title="Sleep schedule" action={<button type="button" onClick={addSleepEntry}>Add dated entry +</button>}>
                <div className="baby-journal-sleep-list">
                    {sortJournalDateKeysNewestFirst(Object.keys(journal.sleepSchedule)).map((dateKey) => (
                        <div className="baby-journal-sleep-entry" key={dateKey}>
                            <strong>{formatJournalDate(dateKey)}</strong>
                            <BabyField label="Day sleep" value={journal.sleepSchedule[dateKey].daySleeping} onChange={(value) => updateSleepEntry(dateKey, "daySleeping", value)}/>
                            <BabyField label="Night sleep" value={journal.sleepSchedule[dateKey].nightSleeping} onChange={(value) => updateSleepEntry(dateKey, "nightSleeping", value)}/>
                            <BabyField label="Ways of sleeping" value={journal.sleepSchedule[dateKey].waysOfSleeping} onChange={(value) => updateSleepEntry(dateKey, "waysOfSleeping", value)}/>
                            <BabyTextArea label="Progress" value={journal.sleepSchedule[dateKey].nightSleepingProgress} onChange={(value) => updateSleepEntry(dateKey, "nightSleepingProgress", value)} rows={3}/>
                        </div>
                    ))}
                    {!latestSleep && <div className="baby-journal-empty-card">No sleep entries yet. Add a dated entry when ready.</div>}
                </div>
            </EditorCard>
        </>
    );
}

function BabyJournalHealthEditor({journal, setJournal}: {journal: BabyJournalInformation; setJournal: any}) {
    const [recordDialogCategory, setRecordDialogCategory] = useState<typeof healthCategories[number] | null>(null);
    const [recordDialogText, setRecordDialogText] = useState("");

    const updateParent = (parentKey: "mother" | "father", field: keyof BabyJournalInformation["mother"], value: any) => {
        setJournal((previous: BabyJournalInformation) => ({
            ...previous,
            [parentKey]: {...previous[parentKey], [field]: value},
        }));
    };

    const updateInvestigation = (category: typeof healthCategories[number]["field"], dateKey: string, description: string) => {
        setJournal((previous: BabyJournalInformation) => ({
            ...previous,
            [category]: {
                ...previous[category],
                [dateKey]: {
                    ...(previous[category][dateKey] || {description: "", assets: []}),
                    description,
                },
            },
        }));
    };

    const openRecordDialog = (category: typeof healthCategories[number]) => {
        setRecordDialogCategory(category);
        setRecordDialogText("");
    };

    const closeRecordDialog = () => {
        setRecordDialogCategory(null);
        setRecordDialogText("");
    };

    const saveRecordDialog = () => {
        if (!recordDialogCategory || !recordDialogText.trim()) {
            return;
        }

        const dateKey = new Date().toISOString().slice(0, 10);
        setJournal((previous: BabyJournalInformation) => ({
            ...previous,
            [recordDialogCategory.field]: {
                ...previous[recordDialogCategory.field],
                [dateKey]: {
                    ...(previous[recordDialogCategory.field][dateKey] || {description: "", assets: []}),
                    description: recordDialogText.trim(),
                },
            },
        }));
        closeRecordDialog();
    };

    return (
        <>
            <EditorCard id="baby-health-summary" kicker="01 · HEALTH OVERVIEW" title="Health overview">
                <div className="baby-journal-health-summary">
                    {healthCategories.map((category) => (
                        <div key={category.field}>
                            <strong>{category.label}</strong>
                            <span>{Object.keys(journal[category.field]).length} dated records</span>
                        </div>
                    ))}
                    <BabyTextArea label="Other health conditions" value={journal.otherHealthConditions} onChange={(value) => setJournal((previous: BabyJournalInformation) => ({...previous, otherHealthConditions: value}))} rows={4}/>
                </div>
            </EditorCard>

            <EditorCard id="baby-health-records" kicker="02 · MEDICAL RECORDS" title="Medical files">
                <div className="baby-journal-two-column">
                    <div>
                        <strong>Medical records</strong>
                        <JournalFileUpload value={journal.medicalRecords} onChange={(medicalRecords) => setJournal((previous: BabyJournalInformation) => ({...previous, medicalRecords}))} storageFolder={DB_STORAGE.BABY_JOURNAL} storageKey="medical-record" multiple maxFiles={3} label="Medical record"/>
                    </div>
                    <div>
                        <strong>European Health Card</strong>
                        <JournalFileUpload value={journal.europeanHealthCard} onChange={(europeanHealthCard) => setJournal((previous: BabyJournalInformation) => ({...previous, europeanHealthCard}))} storageFolder={DB_STORAGE.BABY_JOURNAL} storageKey="european-health-card" maxFiles={1} label="European Health Card"/>
                    </div>
                </div>
            </EditorCard>

            <EditorCard id="baby-health-categories" kicker="03 · DATED HEALTH RECORDS" title="Dated categories">
                <div className="baby-journal-health-categories">
                    {healthCategories.map((category) => {
                        const dateKeys = sortJournalDateKeysNewestFirst(Object.keys(journal[category.field]));
                        return (
                            <section key={category.field} className="baby-journal-health-category">
                                <div className="baby-journal-health-category-header">
                                    <h3>{category.label}</h3>
                                    <button type="button" className="baby-journal-add-record-button" onClick={() => openRecordDialog(category)}>Add record</button>
                                </div>
                                {dateKeys.length === 0 && <p>{category.empty}</p>}
                                {dateKeys.map((dateKey) => (
                                    <div key={`${category.field}-${dateKey}`} className="baby-journal-investigation-row">
                                        <strong>{formatJournalDate(dateKey)}</strong>
                                        <BabyTextArea label={`${category.label} details`} value={journal[category.field][dateKey].description} onChange={(value) => updateInvestigation(category.field, dateKey, value)} rows={3}/>
                                    </div>
                                ))}
                            </section>
                        );
                    })}
                </div>
            </EditorCard>

            <Dialog
                open={Boolean(recordDialogCategory)}
                onClose={closeRecordDialog}
                fullWidth
                maxWidth="sm"
                className="baby-journal-record-dialog"
            >
                <DialogTitle>Add {recordDialogCategory?.label.toLowerCase()} record</DialogTitle>
                <DialogContent>
                    <label className="baby-journal-field baby-journal-textarea">
                        <span>Record details</span>
                        <textarea
                            value={recordDialogText}
                            rows={6}
                            placeholder="Write the record details"
                            onChange={(event) => setRecordDialogText(event.target.value)}
                        />
                    </label>
                </DialogContent>
                <DialogActions>
                    <button type="button" className="baby-journal-button secondary" onClick={closeRecordDialog}>Cancel</button>
                    <button type="button" className="baby-journal-button primary" onClick={saveRecordDialog} disabled={!recordDialogText.trim()}>Save record</button>
                </DialogActions>
            </Dialog>

            <EditorCard id="baby-parent-profiles" kicker="04 · PARENT PROFILES" title="Parent profiles">
                <div className="baby-journal-two-column">
                    {(["mother", "father"] as const).map((parentKey) => (
                        <section key={parentKey} className="baby-journal-parent-card">
                            <h3>{parentKey === "mother" ? "Mother" : "Father"}</h3>
                            <ProfileUpload value={journal[parentKey].profilePicture} onChange={(profilePicture) => updateParent(parentKey, "profilePicture", profilePicture)} storageFolder={DB_STORAGE.BABY_JOURNAL}/>
                            <BabyField label="Name" value={journal[parentKey].name} onChange={(value) => updateParent(parentKey, "name", value)}/>
                            <BabyField label="Allergies" value={journal[parentKey].allergies} onChange={(value) => updateParent(parentKey, "allergies", value)}/>
                            <BabyField label="Diseases" value={journal[parentKey].diseases} onChange={(value) => updateParent(parentKey, "diseases", value)}/>
                            <BabyField label="Chronic adverse reactions" value={journal[parentKey].chronicAversions} onChange={(value) => updateParent(parentKey, "chronicAversions", value)}/>
                            <BabyField label="Blood type" value={journal[parentKey].bloodType} onChange={(value) => updateParent(parentKey, "bloodType", value)}/>
                        </section>
                    ))}
                </div>
            </EditorCard>
        </>
    );
}

function EditorCard({id, kicker, title, action, children}: {id: string; kicker: string; title: string; action?: ReactNode; children: ReactNode}) {
    return (
        <section className="baby-journal-editor-card" id={id} tabIndex={-1}>
            <header>
                <div>
                    <p className="business-kicker">{kicker}</p>
                    <h2>{title}</h2>
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

function BabyField({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
    return (
        <label className="baby-journal-field">
            <span>{label}</span>
            <input value={value} onChange={(event) => onChange(event.target.value)} autoComplete="off"/>
        </label>
    );
}

function BabyTextArea({label, value, onChange, rows = 4}: {label: string; value: string; onChange: (value: string) => void; rows?: number}) {
    return (
        <label className="baby-journal-field baby-journal-textarea">
            <span>{label}</span>
            <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)}/>
        </label>
    );
}

export interface EditContext<T> {
    value: T,
    onChange: (value: T) => void
}

function useCreateMultipleInvestigationsHandlerBaby(field: keyof BabyJournalInformation): MultipleInvestigationsHandler {
    const {babyJournalState, setBabyJournalState} = useContext(BabyJournalStateContext)
    let tempInvestigations: { [key: string]: InvestigationHandler } = {}
    const useGetInvestigations = () => {
        return (): { [key: string]: InvestigationHandler } => {
            const keys = Object.keys(babyJournalState[field])
            tempInvestigations = {}
            keys.forEach((key: string) => {
                tempInvestigations[key] = {
                    description: {
                        value: (babyJournalState[field] as MultipleInvestigations)[key].description,
                        onChange: (description: string) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
                                ...prev,
                                [field]: {
                                    ...(prev[field] as MultipleInvestigations),
                                    [key]: {
                                        ...(prev[field] as MultipleInvestigations)[key],
                                        description
                                    }
                                }
                            }))
                        }
                    },
                    assets: {
                        value: (babyJournalState[field] as MultipleInvestigations)[key].assets,
                        onChange: (assets: Asset[]) => {
                            setBabyJournalState((prev: BabyJournalInformation) => ({
                                ...prev,
                                [field]: {
                                    ...(prev[field] as MultipleInvestigations),
                                    [key]: {
                                        ...(prev[field] as MultipleInvestigations)[key],
                                        assets
                                    }
                                }
                            }))
                        }
                    }

                }
            })
            return tempInvestigations
        }
    }

    const onAdd = useCallback((dateKey: string) => {
        setBabyJournalState((prev: BabyJournalInformation) => ({
            ...prev,
            [field]: {
                ...(prev[field] as MultipleInvestigations),
                [dateKey]: defaultInvestigation
            }
        }))
    }, [field, setBabyJournalState])

    const onDelete = useCallback((dateKey: string) => {
        setBabyJournalState((prev: BabyJournalInformation) => {
            const {[dateKey]: _, ...investigationsLeft} = prev[field] as MultipleInvestigations
            return {
                ...prev,
                [field]: investigationsLeft
            }
        })
    }, [field, setBabyJournalState])

    const getInvestigations = useGetInvestigations()
    return useMemo(() => ({
        onDelete,
        onAdd,
        investigations: getInvestigations()
    }), [onAdd, getInvestigations, onDelete])
}

function useBabyJournalEdit(): useBabyJournalEditInterface {
    const {babyJournalState, setBabyJournalState} = useContext(BabyJournalStateContext)
    // const investigationsHandler = useGenerateInvestigationsHandler()

    return {
        name: {
            value: babyJournalState.name,
            onChange: (name: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, name}))
            }
        },
        gender: {
            value: babyJournalState.gender,
            onChange: (gender: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, gender}))
            }
        },
        birthDate: {
            value: babyJournalState.birthDate,
            onChange: (birthDate: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, birthDate}))
            }
        },
        timeOfBirth: {
            value: babyJournalState.timeOfBirth,
            onChange: (timeOfBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, timeOfBirth}))
            }
        },
        apgar: {
            value: babyJournalState.apgar,
            onChange: (apgar: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, apgar}))
            }
        },
        weightOnBirth: {
            value: babyJournalState.weightOnBirth,
            onChange: (weightOnBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, weightOnBirth}))
            }
        },
        heightOnBirth: {
            value: babyJournalState.heightOnBirth,
            onChange: (heightOnBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, heightOnBirth}))
            }
        },
        placeOfBirth: {
            value: babyJournalState.placeOfBirth,
            onChange: (placeOfBirth: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, placeOfBirth}))
            }
        },
        biography: {
            value: babyJournalState.biography,
            onChange: (biography: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, biography}))
            }
        },
        firstHeadHold: {
            value: babyJournalState.firstHeadHold,
            onChange: (firstHeadHold: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstHeadHold}))
            }
        },
        firstRoll: {
            value: babyJournalState.firstRoll,
            onChange: (firstRoll: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstRoll}))
            }
        },
        firstSit: {
            value: babyJournalState.firstSit,
            onChange: (firstSit: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstSit}))
            }
        },
        firstSteps: {
            value: babyJournalState.firstSteps,
            onChange: (firstSteps: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstSteps}))
            }
        },
        firstRun: {
            value: babyJournalState.firstRun,
            onChange: (firstRun: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstRun}))
            }
        },
        firstBreastfeeding: {
            value: babyJournalState.firstBreastfeeding,
            onChange: (firstBreastfeeding: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstBreastfeeding}))
            }
        },
        firstFormula: {
            value: babyJournalState.firstFormula,
            onChange: (firstFormula: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstFormula}))
            }
        },
        introductionOfCereal: {
            value: babyJournalState.introductionOfCereal,
            onChange: (introductionOfCereal: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, introductionOfCereal}))
            }
        },
        firstSolidFeeding: {
            value: babyJournalState.firstSolidFeeding,
            onChange: (firstSolidFeeding: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, firstSolidFeeding}))
            }
        },
        foodPreferences: {
            value: babyJournalState.foodPreferences,
            onChange: (foodPreferences: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, foodPreferences}))
            }
        },
        foodAversions: {
            value: babyJournalState.foodAversions,
            onChange: (foodAversions: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, foodAversions}))
            }
        },
        sleepSchedule: useCreateMultipleSleepScheduleHandler(),
        // investigations: investigationsHandler,
        mother: {
            profilePicture: {
                value: babyJournalState.mother.profilePicture,
                onChange: (profilePicture: Asset[]) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, profilePicture}
                    }))
                }
            },
            name: {
                value: babyJournalState.mother.name,
                onChange: (name: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({...prev, mother: {...prev.mother, name}}))
                }
            },
            allergies: {
                value: babyJournalState.mother.allergies,
                onChange: (allergies: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, allergies}
                    }))
                }
            },
            diseases: {
                value: babyJournalState.mother.diseases,
                onChange: (diseases: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, diseases}
                    }))
                }
            },
            chronicAversions: {
                value: babyJournalState.mother.chronicAversions,
                onChange: (chronicAversions: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, chronicAversions}
                    }))
                }
            },
            bloodType: {
                value: babyJournalState.mother.bloodType,
                onChange: (bloodType: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        mother: {...prev.mother, bloodType}
                    }))
                }
            }
        },
        father: {
            profilePicture: {
                value: babyJournalState.father.profilePicture,
                onChange: (profilePicture: Asset[]) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, profilePicture}
                    }))
                }
            },
            name: {
                value: babyJournalState.father.name,
                onChange: (name: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({...prev, father: {...prev.father, name}}))
                }
            },
            allergies: {
                value: babyJournalState.father.allergies,
                onChange: (allergies: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, allergies}
                    }))
                }
            },
            diseases: {
                value: babyJournalState.father.diseases,
                onChange: (diseases: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, diseases}
                    }))
                }
            },
            chronicAversions: {
                value: babyJournalState.father.chronicAversions,
                onChange: (chronicAversions: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, chronicAversions}
                    }))
                }
            },
            bloodType: {
                value: babyJournalState.father.bloodType,
                onChange: (bloodType: string) => {
                    setBabyJournalState((prev: BabyJournalInformation) => ({
                        ...prev,
                        father: {...prev.father, bloodType}
                    }))
                }
            }
        },
        healthProblems: useCreateMultipleInvestigationsHandlerBaby("healthProblems"),
        vaccines: useCreateMultipleInvestigationsHandlerBaby("vaccines"),
        allergies: useCreateMultipleInvestigationsHandlerBaby("allergies"),
        medication: useCreateMultipleInvestigationsHandlerBaby("medication"),
        chronicAversions: useCreateMultipleInvestigationsHandlerBaby("chronicAversions"),
        otherHealthConditions: {
            value: babyJournalState.otherHealthConditions,
            onChange: (otherHealthConditions: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, otherHealthConditions}))
            }
        },
        medicalRecords: {
            value: babyJournalState.medicalRecords,
            onChange: (medicalRecords: Asset[]) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, medicalRecords}))
            }
        },
        profilePicture: {
            value: babyJournalState.profilePicture,
            onChange: (profilePicture: Asset[]) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, profilePicture}))
            }
        },
        bloodType: {
            value: babyJournalState.bloodType,
            onChange: (bloodType: string) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, bloodType}))
            }
        },
        europeanHealthCard: {
            value: babyJournalState.europeanHealthCard,
            onChange: (europeanHealthCard: Asset[]) => {
                setBabyJournalState((prev: BabyJournalInformation) => ({...prev, europeanHealthCard}))
            }
        },
    }
}

// function useGenerateInvestigationsHandler() {
//     const {babyJournalState, setBabyJournalState} = useBabyJournalInformation()
//     return babyJournalState.investigations.map((investigation, index) => {
//         return {
//             name: {
//                 value: investigation.name,
//                 onChange: (name: string) => {
//                     setBabyJournalState((prev: BabyJournalInformation) => {
//                         const tempInvestigations = prev.investigations
//                         tempInvestigations[index].name = name
//                         return tempInvestigations
//                     })
//                 }
//             },
//             details: {
//                 value: investigation.details,
//                 onChange: (details: string) => {
//                     setBabyJournalState((prev: BabyJournalInformation) => {
//                         const tempInvestigations = prev.investigations
//                         tempInvestigations[index].details = details
//                         return tempInvestigations
//                     })
//                 }
//             },
//         }
//     })
//
// }

export const BabyJournalEditContext = createContext<useBabyJournalEditInterface | null>(null)
export const BabyJournalStateContext = createContext<UseBabyJournalInformationValue>({
    babyJournalState: defaultInformation,
    setBabyJournalState: () => {
    },
    originalBabyJournalState: defaultInformation,
    setOriginalBabyJournalState: () => {
    },
})

export function BabyJournalStateContextProvider({children}: any) {
    const value = useBabyJournalInformation()
    if (!value) return null
    return <BabyJournalStateContext.Provider value={value}>
        {children}
    </BabyJournalStateContext.Provider>
}

export function BabyJournalEditContextProvider({children}: any) {
    const value = useBabyJournalEdit()
    if (!value) return null
    return <BabyJournalEditContext.Provider value={value}>
        {children}
    </BabyJournalEditContext.Provider>
}
