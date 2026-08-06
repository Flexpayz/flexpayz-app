import {useEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {db} from "../App";
import {
    buildAdultJournalUpdate,
    careSections,
    countInvestigationAssets,
    countInvestigationRecords,
    emptyAdultJournalInformation,
    formatAdultDate,
    getAdultJournalCompletion,
    getLatestVitalSigns,
    hasAdultJournalChanges,
    investigationGroups,
    latestRecordDate,
    maskPersonalId,
    normalizeAdultJournal,
    sortAdultDateKeysNewestFirst,
    type InvestigationField,
} from "../adult-journal";
import {getProductIdFromURL} from "../utils";
import {notify} from "../Pages/login-page";
import {FlexPayzLogo, LoadingPanel} from "./design-system";
import {DB_COLLECTIONS, DB_STORAGE} from "./baby-journal-settings";
import type {AdultJournalInformation, Consultation, FollowUp, Investigation, VitalSigns} from "./adult-journal-settings";
import {ProfileUpload} from "./profile-upload";
import AssetUpload3 from "./asset-upload-3";

type AdultJournalEditorTab = "home" | "health" | "tests" | "care";
type SaveState = "clean" | "dirty" | "saving" | "saved" | "failed";

const defaultVitalSigns: VitalSigns = {
    bloodPressure: "",
    pulse: "",
    temperature: "",
    respiratoryRate: "",
};

const defaultInvestigation: Investigation = {
    description: "",
    assets: [],
};

const defaultConsultation: Consultation = {
    interdisciplinaryConsultation: "",
    recommendation: "",
};

const defaultFollowUp: FollowUp = {
    appointments: "",
    monitoringProgress: "",
};

const sectionLinks: Record<AdultJournalEditorTab, Array<{id: string; label: string}>> = {
    home: [
        {id: "adult-personal-data", label: "Personal data"},
        {id: "adult-latest-vitals", label: "Latest vitals"},
        {id: "adult-record-overview", label: "Record overview"},
    ],
    health: [
        {id: "adult-health-history", label: "Medical history"},
        {id: "adult-vital-signs", label: "Vital signs"},
        {id: "adult-health-card", label: "Health card"},
    ],
    tests: [
        {id: "adult-test-laboratory", label: "Laboratory"},
        {id: "adult-test-imaging", label: "Imaging"},
        {id: "adult-test-functional", label: "Functional"},
    ],
    care: [
        {id: "adult-care-consultations", label: "Consultations"},
        {id: "adult-care-plan", label: "Care plan"},
        {id: "adult-care-follow-up", label: "Follow-up"},
    ],
};

export function AdultJournalWorkspace() {
    const productId = getProductIdFromURL();
    const [journal, setJournal] = useState<AdultJournalInformation>(emptyAdultJournalInformation);
    const [originalJournal, setOriginalJournal] = useState<AdultJournalInformation>(emptyAdultJournalInformation);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [activeTab, setActiveTab] = useState<AdultJournalEditorTab>("home");
    const [saveState, setSaveState] = useState<SaveState>("clean");
    const [saveMessage, setSaveMessage] = useState("No unsaved changes");
    const [identifierRevealed, setIdentifierRevealed] = useState(false);
    const headingRef = useRef<HTMLHeadingElement | null>(null);

    const completion = useMemo(() => getAdultJournalCompletion(journal), [journal]);
    const dirty = useMemo(() => hasAdultJournalChanges(journal, originalJournal), [journal, originalJournal]);
    const latestVitals = useMemo(() => getLatestVitalSigns(journal.vitalSigns), [journal.vitalSigns]);
    const investigationCount = useMemo(() => {
        let count = 0;
        investigationGroups.forEach((group) => {
            group.fields.forEach(([field]) => {
                count += countInvestigationRecords(journal[field]);
            });
        });
        return count;
    }, [journal]);
    const careCount = useMemo(() => careSections.reduce((count, [field]) => count + countInvestigationRecords(journal[field]), 0), [journal]);

    useEffect(() => {
        let active = true;
        async function loadJournal() {
            if (!productId) {
                setLoadState("error");
                return;
            }
            try {
                const snapshot = await getDoc(doc(db, DB_COLLECTIONS.ADULT_JOURNALS, productId));
                if (!active) return;
                const normalized = normalizeAdultJournal(snapshot.exists() ? snapshot.data() : {});
                setJournal(normalized);
                setOriginalJournal(normalized);
                setLoadState("ready");
            } catch {
                if (active) setLoadState("error");
            }
        }
        loadJournal();
        return () => {
            active = false;
        };
    }, [productId]);

    useEffect(() => {
        if (saveState !== "saving" && saveState !== "failed") {
            setSaveState(dirty ? "dirty" : "clean");
            setSaveMessage(dirty ? "Unsaved changes" : "No unsaved changes");
        }
    }, [dirty, saveState]);

    useEffect(() => {
        setIdentifierRevealed(false);
        headingRef.current?.focus();
    }, [activeTab]);

    useEffect(() => {
        const reMask = () => {
            if (document.hidden) setIdentifierRevealed(false);
        };
        document.addEventListener("visibilitychange", reMask);
        return () => document.removeEventListener("visibilitychange", reMask);
    }, []);

    const updateField = <K extends keyof AdultJournalInformation>(field: K, value: AdultJournalInformation[K]) => {
        setJournal((previous) => ({...previous, [field]: value}));
    };

    const addDatedEntry = (field: InvestigationField) => {
        const dateKey = new Date().toISOString().slice(0, 10);
        setJournal((previous) => {
            const existing = previous[field][dateKey];
            return {
                ...previous,
                [field]: {
                    ...previous[field],
                    [dateKey]: existing || defaultInvestigation,
                },
            };
        });
        setSaveMessage("Dated record ready to edit");
    };

    const updateInvestigation = (field: InvestigationField, dateKey: string, value: Investigation) => {
        setJournal((previous) => ({
            ...previous,
            [field]: {
                ...previous[field],
                [dateKey]: value,
            },
        }));
    };

    const deleteInvestigation = (field: InvestigationField, dateKey: string) => {
        setJournal((previous) => {
            const {[dateKey]: removed, ...remaining} = previous[field];
            return {...previous, [field]: remaining};
        });
    };

    const addVitals = () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        setJournal((previous) => ({
            ...previous,
            vitalSigns: {
                ...previous.vitalSigns,
                [dateKey]: previous.vitalSigns[dateKey] || defaultVitalSigns,
            },
        }));
        setSaveMessage("Vital-sign record ready to edit");
    };

    const updateVitals = (dateKey: string, field: keyof VitalSigns, value: string) => {
        setJournal((previous) => ({
            ...previous,
            vitalSigns: {
                ...previous.vitalSigns,
                [dateKey]: {
                    ...(previous.vitalSigns[dateKey] || defaultVitalSigns),
                    [field]: value,
                },
            },
        }));
    };

    const deleteVitals = (dateKey: string) => {
        setJournal((previous) => {
            const {[dateKey]: removed, ...remaining} = previous.vitalSigns;
            return {...previous, vitalSigns: remaining};
        });
    };

    const addConsultation = () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        setJournal((previous) => ({
            ...previous,
            consultations: {
                ...previous.consultations,
                [dateKey]: previous.consultations[dateKey] || defaultConsultation,
            },
        }));
    };

    const updateConsultation = (dateKey: string, field: keyof Consultation, value: string) => {
        setJournal((previous) => ({
            ...previous,
            consultations: {
                ...previous.consultations,
                [dateKey]: {
                    ...(previous.consultations[dateKey] || defaultConsultation),
                    [field]: value,
                },
            },
        }));
    };

    const addFollowUp = () => {
        const dateKey = new Date().toISOString().slice(0, 10);
        setJournal((previous) => ({
            ...previous,
            followUp: {
                ...previous.followUp,
                [dateKey]: previous.followUp[dateKey] || defaultFollowUp,
            },
        }));
    };

    const updateFollowUp = (dateKey: string, field: keyof FollowUp, value: string) => {
        setJournal((previous) => ({
            ...previous,
            followUp: {
                ...previous.followUp,
                [dateKey]: {
                    ...(previous.followUp[dateKey] || defaultFollowUp),
                    [field]: value,
                },
            },
        }));
    };

    const deleteFollowUp = (dateKey: string) => {
        setJournal((previous) => {
            const {[dateKey]: removed, ...remaining} = previous.followUp;
            return {...previous, followUp: remaining};
        });
    };

    const saveJournal = async () => {
        if (!productId || saveState === "saving") return;
        const updates = buildAdultJournalUpdate(journal, originalJournal);
        if (Object.keys(updates).length === 0) {
            setSaveState("clean");
            setSaveMessage("No changes to save");
            return;
        }
        setSaveState("saving");
        setSaveMessage("Saving journal…");
        try {
            await updateDoc(doc(db, DB_COLLECTIONS.ADULT_JOURNALS, productId), updates as Record<string, any>);
            setOriginalJournal(journal);
            setSaveState("saved");
            setSaveMessage("Changes saved");
            notify("Adult Journal saved");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your changes are still here.");
            notify("Adult Journal could not be saved");
        }
    };

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        element?.scrollIntoView({behavior: "smooth", block: "start"});
        if (element instanceof HTMLElement) element.focus({preventScroll: true});
    };

    if (loadState === "loading") {
        return (
            <div className="baby-journal-editor-shell">
                <div className="baby-journal-editor-state">
                    <LoadingPanel text="Loading adult journal workspace"/>
                </div>
            </div>
        );
    }

    if (loadState === "error") {
        return (
            <div className="baby-journal-editor-shell">
                <div className="baby-journal-editor-state" role="alert">
                    <p>Adult Journal is unavailable. Refresh the page and try again.</p>
                </div>
            </div>
        );
    }

    const activeLinks = sectionLinks[activeTab];

    return (
        <main className="baby-journal-editor-layout adult-journal-editor-layout" aria-label="Adult Journal editor">
            <aside className="baby-journal-editor-sidebar" aria-label="Adult Journal navigation">
                <FlexPayzLogo className="baby-journal-editor-logo"/>
                <AdultJournalIdentity journal={journal} completion={completion}/>
                <nav className="baby-journal-editor-tabs" aria-label="Adult Journal areas">
                    <button type="button" className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>⌂ Overview</button>
                    <button type="button" className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}>♡ Health</button>
                    <button type="button" className={activeTab === "tests" ? "active" : ""} onClick={() => setActiveTab("tests")}>↝ Tests</button>
                    <button type="button" className={activeTab === "care" ? "active" : ""} onClick={() => setActiveTab("care")}>＋ Care</button>
                </nav>
                <div className="baby-journal-editor-section-links">
                    {activeLinks.map((link) => (
                        <button key={link.id} type="button" onClick={() => scrollToSection(link.id)}>{link.label}</button>
                    ))}
                </div>
                <div className="baby-journal-editor-status-card">
                    <strong>{completion}%</strong>
                    <span>Complete</span>
                    <div><span style={{transform: `scaleX(${completion / 100})`}}/></div>
                </div>
                <div className={`baby-journal-editor-status-card ${saveState}`}>
                    <strong>{saveState === "saving" ? "Saving" : saveState === "failed" ? "Needs retry" : saveState === "saved" ? "Saved" : "Autosave off"}</strong>
                    <span>{saveMessage}</span>
                </div>
            </aside>

            <section className="baby-journal-editor-main">
                <header className="baby-journal-editor-header">
                    <div>
                        <p className="business-kicker">ADULT JOURNAL SETTINGS</p>
                        <h1 ref={headingRef} tabIndex={-1}>{getEditorTitle(activeTab)}</h1>
                        <p>{getEditorDescription(activeTab)}</p>
                    </div>
                    <div className="baby-journal-editor-actions">
                        <span>{completion}% complete</span>
                        <a className="baby-journal-button secondary" href={`/show-product?product_id=${productId}`} target="_blank" rel="noreferrer">Preview journal ↗</a>
                    </div>
                    <nav className="baby-journal-mobile-tabs adult-journal-mobile-tabs" role="tablist" aria-label="Adult Journal areas">
                        <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>⌂ Home</button>
                        <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}>♡ Health</button>
                        <button type="button" role="tab" aria-selected={activeTab === "tests"} className={activeTab === "tests" ? "active" : ""} onClick={() => setActiveTab("tests")}>↝ Tests</button>
                        <button type="button" role="tab" aria-selected={activeTab === "care"} className={activeTab === "care" ? "active" : ""} onClick={() => setActiveTab("care")}>＋ Care</button>
                    </nav>
                </header>

                <div className="baby-journal-editor-content">
                    {activeTab === "home" && (
                        <AdultJournalHomeEditor
                            journal={journal}
                            updateField={updateField}
                            identifierRevealed={identifierRevealed}
                            setIdentifierRevealed={setIdentifierRevealed}
                            latestVitals={latestVitals}
                            investigationCount={investigationCount}
                            careCount={careCount}
                        />
                    )}
                    {activeTab === "health" && (
                        <AdultJournalHealthEditor
                            journal={journal}
                            updateField={updateField}
                            addVitals={addVitals}
                            updateVitals={updateVitals}
                            deleteVitals={deleteVitals}
                        />
                    )}
                    {activeTab === "tests" && (
                        <AdultJournalTestsEditor
                            journal={journal}
                            addDatedEntry={addDatedEntry}
                            updateInvestigation={updateInvestigation}
                            deleteInvestigation={deleteInvestigation}
                        />
                    )}
                    {activeTab === "care" && (
                        <AdultJournalCareEditor
                            journal={journal}
                            addDatedEntry={addDatedEntry}
                            updateInvestigation={updateInvestigation}
                            deleteInvestigation={deleteInvestigation}
                            addConsultation={addConsultation}
                            updateConsultation={updateConsultation}
                            addFollowUp={addFollowUp}
                            updateFollowUp={updateFollowUp}
                            deleteFollowUp={deleteFollowUp}
                        />
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

function getEditorTitle(activeTab: AdultJournalEditorTab) {
    if (activeTab === "health") return "Health records, easy to review";
    if (activeTab === "tests") return "Find investigations quickly";
    if (activeTab === "care") return "Care and procedures in context";
    return "A complete record, without the clutter";
}

function getEditorDescription(activeTab: AdultJournalEditorTab) {
    if (activeTab === "health") return "Record what changed recently and keep sensitive history grouped by topic.";
    if (activeTab === "tests") return "Preserve every existing investigation field while grouping records into readable categories.";
    if (activeTab === "care") return "Keep consultations, treatment, procedures and follow-up grouped together.";
    return "Start with what changed recently, then move into the complete dated history.";
}

function AdultJournalIdentity({journal, completion}: {journal: AdultJournalInformation; completion: number}) {
    const photo = journal.profilePicture[0];
    return (
        <div className="baby-journal-editor-identity">
            {photo ? <img src={photo.url} alt=""/> : <span aria-hidden="true">◒</span>}
            <p>{journal.name || "Adult Journal"}</p>
            <strong>Adult Journal</strong>
            <small>Medical record · {journal.medicalRecordNumber || "Not assigned"}</small>
            <em>{completion >= 70 ? "Protected" : "In progress"}</em>
        </div>
    );
}

function AdultJournalHomeEditor({
    journal,
    updateField,
    identifierRevealed,
    setIdentifierRevealed,
    latestVitals,
    investigationCount,
    careCount,
}: {
    journal: AdultJournalInformation;
    updateField: <K extends keyof AdultJournalInformation>(field: K, value: AdultJournalInformation[K]) => void;
    identifierRevealed: boolean;
    setIdentifierRevealed: (value: boolean) => void;
    latestVitals: {dateKey: string; value: VitalSigns} | null;
    investigationCount: number;
    careCount: number;
}) {
    return (
        <>
            <EditorCard id="adult-personal-data" kicker="PERSONAL DATA" title="Personal record">
                <div className="baby-journal-profile-row">
                    <ProfileUpload value={journal.profilePicture} onChange={(assets) => updateField("profilePicture", assets)} storageFolder={DB_STORAGE.ADULT_JOURNAL}/>
                    <div className="baby-journal-field-grid">
                        <Field label="Full name" value={journal.name} onChange={(value) => updateField("name", value)}/>
                        <Field label="Birth date" value={journal.birthDate} onChange={(value) => updateField("birthDate", value)}/>
                        <Field label="Gender" value={journal.gender} onChange={(value) => updateField("gender", value)}/>
                        <Field label="Blood type" value={journal.bloodType} onChange={(value) => updateField("bloodType", value)}/>
                        <Field label="Record number" value={journal.medicalRecordNumber} onChange={(value) => updateField("medicalRecordNumber", value)}/>
                        <Field label="Phone" value={journal.phone} onChange={(value) => updateField("phone", value)}/>
                    </div>
                </div>
                <Field label="Address" value={journal.address} onChange={(value) => updateField("address", value)}/>
                <SensitiveIdentifierField
                    value={journal.personalIdNumber}
                    revealed={identifierRevealed}
                    onRevealChange={setIdentifierRevealed}
                    onChange={(value) => updateField("personalIdNumber", value)}
                />
            </EditorCard>

            <EditorCard id="adult-latest-vitals" kicker="LATEST VITAL SIGNS" title="Healthy at a glance">
                <div className="baby-journal-health-summary">
                    <Metric label="Blood pressure" value={latestVitals?.value.bloodPressure}/>
                    <Metric label="Pulse" value={latestVitals?.value.pulse}/>
                    <Metric label="Temperature" value={latestVitals?.value.temperature}/>
                    <Metric label="Respiratory rate" value={latestVitals?.value.respiratoryRate}/>
                </div>
                <p>Latest record: {latestVitals ? formatAdultDate(latestVitals.dateKey) : "No vital signs recorded yet"}</p>
            </EditorCard>

            <EditorCard id="adult-record-overview" kicker="OVERVIEW" title="Record map">
                <div className="baby-journal-field-grid">
                    <Metric label="Investigation records" value={String(investigationCount)}/>
                    <Metric label="Care records" value={String(careCount)}/>
                    <Metric label="Health card" value={journal.europeanHealthCard.length ? "Attached" : "Missing"}/>
                </div>
            </EditorCard>
        </>
    );
}

function AdultJournalHealthEditor({
    journal,
    updateField,
    addVitals,
    updateVitals,
    deleteVitals,
}: {
    journal: AdultJournalInformation;
    updateField: <K extends keyof AdultJournalInformation>(field: K, value: AdultJournalInformation[K]) => void;
    addVitals: () => void;
    updateVitals: (dateKey: string, field: keyof VitalSigns, value: string) => void;
    deleteVitals: (dateKey: string) => void;
}) {
    const vitalDates = sortAdultDateKeysNewestFirst(Object.keys(journal.vitalSigns));
    return (
        <>
            <EditorCard id="adult-health-history" kicker="MEDICAL HISTORY" title="Current health context">
                <TextArea label="Previous conditions" value={journal.previousConditions} onChange={(value) => updateField("previousConditions", value)}/>
                <div className="baby-journal-field-grid">
                    <Field label="Current medication" value={journal.medication} onChange={(value) => updateField("medication", value)}/>
                    <Field label="Allergies" value={journal.allergies} onChange={(value) => updateField("allergies", value)}/>
                    <Field label="Family history" value={journal.familyHistory} onChange={(value) => updateField("familyHistory", value)}/>
                </div>
                <TextArea label="General physical examination" value={journal.generalPhysicalExamination} onChange={(value) => updateField("generalPhysicalExamination", value)}/>
            </EditorCard>

            <EditorCard id="adult-vital-signs" kicker="DATED VITALS" title="Vital signs" action={<button type="button" onClick={addVitals}>Add vital signs</button>}>
                {vitalDates.length === 0 ? <EmptyEditorCard message="No vital signs recorded yet."/> : vitalDates.map((dateKey) => (
                    <div className="baby-journal-sleep-entry" key={dateKey}>
                        <div className="baby-journal-editor-card-header-inline">
                            <strong>{formatAdultDate(dateKey)}</strong>
                            <button type="button" className="baby-journal-button secondary" onClick={() => deleteVitals(dateKey)}>Remove</button>
                        </div>
                        <div className="baby-journal-field-grid">
                            <Field label="Blood pressure" value={journal.vitalSigns[dateKey].bloodPressure} onChange={(value) => updateVitals(dateKey, "bloodPressure", value)}/>
                            <Field label="Pulse" value={journal.vitalSigns[dateKey].pulse} onChange={(value) => updateVitals(dateKey, "pulse", value)}/>
                            <Field label="Temperature" value={journal.vitalSigns[dateKey].temperature} onChange={(value) => updateVitals(dateKey, "temperature", value)}/>
                            <Field label="Respiratory rate" value={journal.vitalSigns[dateKey].respiratoryRate} onChange={(value) => updateVitals(dateKey, "respiratoryRate", value)}/>
                        </div>
                    </div>
                ))}
            </EditorCard>

            <EditorCard id="adult-health-card" kicker="PROTECTED DOCUMENT" title="European Health Card">
                <AssetUpload3 value={journal.europeanHealthCard} onChange={(assets) => updateField("europeanHealthCard", assets)} storageFolder={DB_STORAGE.ADULT_JOURNAL} maxFiles={1}/>
                <p>Medical files follow the existing global protection before this public section opens.</p>
            </EditorCard>
        </>
    );
}

function AdultJournalTestsEditor({
    journal,
    addDatedEntry,
    updateInvestigation,
    deleteInvestigation,
}: {
    journal: AdultJournalInformation;
    addDatedEntry: (field: InvestigationField) => void;
    updateInvestigation: (field: InvestigationField, dateKey: string, value: Investigation) => void;
    deleteInvestigation: (field: InvestigationField, dateKey: string) => void;
}) {
    return (
        <>
            {investigationGroups.map((group) => (
                <EditorCard key={group.id} id={`adult-test-${group.id}`} kicker="INVESTIGATION GROUP" title={group.label}>
                    {group.fields.map(([field, label]) => (
                        <InvestigationFieldEditor
                            key={field}
                            field={field}
                            label={label}
                            records={journal[field]}
                            addDatedEntry={addDatedEntry}
                            updateInvestigation={updateInvestigation}
                            deleteInvestigation={deleteInvestigation}
                        />
                    ))}
                </EditorCard>
            ))}
        </>
    );
}

function AdultJournalCareEditor({
    journal,
    addDatedEntry,
    updateInvestigation,
    deleteInvestigation,
    addConsultation,
    updateConsultation,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
}: {
    journal: AdultJournalInformation;
    addDatedEntry: (field: InvestigationField) => void;
    updateInvestigation: (field: InvestigationField, dateKey: string, value: Investigation) => void;
    deleteInvestigation: (field: InvestigationField, dateKey: string) => void;
    addConsultation: () => void;
    updateConsultation: (dateKey: string, field: keyof Consultation, value: string) => void;
    addFollowUp: () => void;
    updateFollowUp: (dateKey: string, field: keyof FollowUp, value: string) => void;
    deleteFollowUp: (dateKey: string) => void;
}) {
    const consultationDates = sortAdultDateKeysNewestFirst(Object.keys(journal.consultations));
    const followUpDates = sortAdultDateKeysNewestFirst(Object.keys(journal.followUp));
    return (
        <>
            <EditorCard id="adult-care-consultations" kicker="CONSULTATIONS" title="Specialist context" action={<button type="button" onClick={addConsultation}>Add consultation</button>}>
                {consultationDates.length === 0 ? <EmptyEditorCard message="No consultations recorded yet."/> : consultationDates.map((dateKey) => (
                    <div className="baby-journal-sleep-entry" key={dateKey}>
                        <strong>{formatAdultDate(dateKey)}</strong>
                        <Field label="Interdisciplinary consultation" value={journal.consultations[dateKey].interdisciplinaryConsultation} onChange={(value) => updateConsultation(dateKey, "interdisciplinaryConsultation", value)}/>
                        <TextArea label="Recommendation" value={journal.consultations[dateKey].recommendation} onChange={(value) => updateConsultation(dateKey, "recommendation", value)}/>
                    </div>
                ))}
            </EditorCard>

            <EditorCard id="adult-care-plan" kicker="CARE PLAN" title="Treatment and procedures">
                {careSections.map(([field, label]) => (
                    <InvestigationFieldEditor
                        key={field}
                        field={field}
                        label={label}
                        records={journal[field]}
                        addDatedEntry={addDatedEntry}
                        updateInvestigation={updateInvestigation}
                        deleteInvestigation={deleteInvestigation}
                    />
                ))}
            </EditorCard>

            <EditorCard id="adult-care-follow-up" kicker="FOLLOW-UP" title="Next steps" action={<button type="button" onClick={addFollowUp}>Add follow-up</button>}>
                {followUpDates.length === 0 ? <EmptyEditorCard message="No follow-up records yet."/> : followUpDates.map((dateKey) => (
                    <div className="baby-journal-sleep-entry" key={dateKey}>
                        <div className="baby-journal-editor-card-header-inline">
                            <strong>{formatAdultDate(dateKey)}</strong>
                            <button type="button" className="baby-journal-button secondary" onClick={() => deleteFollowUp(dateKey)}>Remove</button>
                        </div>
                        <Field label="Appointments" value={journal.followUp[dateKey].appointments} onChange={(value) => updateFollowUp(dateKey, "appointments", value)}/>
                        <TextArea label="Monitoring progress" value={journal.followUp[dateKey].monitoringProgress} onChange={(value) => updateFollowUp(dateKey, "monitoringProgress", value)}/>
                    </div>
                ))}
            </EditorCard>
        </>
    );
}

function InvestigationFieldEditor({
    field,
    label,
    records,
    addDatedEntry,
    updateInvestigation,
    deleteInvestigation,
}: {
    field: InvestigationField;
    label: string;
    records: Record<string, Investigation>;
    addDatedEntry: (field: InvestigationField) => void;
    updateInvestigation: (field: InvestigationField, dateKey: string, value: Investigation) => void;
    deleteInvestigation: (field: InvestigationField, dateKey: string) => void;
}) {
    const dates = sortAdultDateKeysNewestFirst(Object.keys(records));
    return (
        <section className="baby-journal-health-category">
            <div>
                <div>
                    <h3>{label}</h3>
                    <p>{countInvestigationRecords(records)} records · {countInvestigationAssets(records)} files{latestRecordDate(records) ? ` · latest ${formatAdultDate(latestRecordDate(records))}` : ""}</p>
                </div>
                <button type="button" onClick={() => addDatedEntry(field)}>Add dated record</button>
            </div>
            {dates.length === 0 ? <EmptyEditorCard message="Nothing recorded yet."/> : dates.map((dateKey) => {
                const record = records[dateKey];
                return (
                    <div className="baby-journal-investigation-row" key={dateKey}>
                        <div className="baby-journal-editor-card-header-inline">
                            <strong>{formatAdultDate(dateKey)}</strong>
                            <button type="button" className="baby-journal-button secondary" onClick={() => deleteInvestigation(field, dateKey)}>Remove</button>
                        </div>
                        <TextArea label="Description" value={record.description} onChange={(description) => updateInvestigation(field, dateKey, {...record, description})}/>
                        <AssetUpload3 value={record.assets} onChange={(assets) => updateInvestigation(field, dateKey, {...record, assets})} storageFolder={DB_STORAGE.ADULT_JOURNAL} multiple maxFiles={3}/>
                    </div>
                );
            })}
        </section>
    );
}

function EditorCard({id, kicker, title, action, children}: {id: string; kicker: string; title: string; action?: ReactNode; children: ReactNode}) {
    return (
        <section id={id} className="baby-journal-editor-card" tabIndex={-1}>
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

function Field({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
    return (
        <label className="baby-journal-field">
            <span>{label}</span>
            <input value={value} onChange={(event) => onChange(event.target.value)}/>
        </label>
    );
}

function TextArea({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
    return (
        <label className="baby-journal-field">
            <span>{label}</span>
            <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)}/>
        </label>
    );
}

function SensitiveIdentifierField({
    value,
    revealed,
    onRevealChange,
    onChange,
}: {
    value: string;
    revealed: boolean;
    onRevealChange: (value: boolean) => void;
    onChange: (value: string) => void;
}) {
    return (
        <div className="baby-journal-field adult-sensitive-id">
            <span>Personal identification number</span>
            {revealed ? (
                <div className="adult-sensitive-id-row">
                    <input value={value} onChange={(event) => onChange(event.target.value)} autoComplete="off"/>
                    <button type="button" className="baby-journal-button secondary" onClick={() => onRevealChange(false)}>Hide</button>
                </div>
            ) : (
                <div className="adult-sensitive-id-row">
                    <strong aria-label="Personal identification number is hidden">{maskPersonalId(value)}</strong>
                    <button type="button" className="baby-journal-button secondary" onClick={() => onRevealChange(true)}>Reveal</button>
                </div>
            )}
            <small>Re-mask automatically after leaving this view. The stored value remains unchanged.</small>
        </div>
    );
}

function Metric({label, value}: {label: string; value?: string}) {
    return (
        <div>
            <span>{label}</span>
            <strong>{value || "Not recorded"}</strong>
        </div>
    );
}

function EmptyEditorCard({message}: {message: string}) {
    return <p className="baby-journal-public-empty">{message}</p>;
}
