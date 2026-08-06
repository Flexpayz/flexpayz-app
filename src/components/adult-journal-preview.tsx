import {useEffect, useMemo, useRef, useState} from "react";
import type {RefObject} from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {doc, getDoc} from "firebase/firestore";
import {db} from "../App";
import {Product} from "../control-state";
import {
    careSections,
    countInvestigationAssets,
    countInvestigationRecords,
    emptyAdultJournalInformation,
    formatAdultDate,
    getLatestVitalSigns,
    investigationGroups,
    maskPersonalId,
    normalizeAdultJournal,
    sortAdultDateKeysNewestFirst,
} from "../adult-journal";
import {DB_COLLECTIONS} from "./baby-journal-settings";
import type {AdultJournalInformation, Investigation} from "./adult-journal-settings";
import {BackButton, FlexPayzLogo, LoadingPanel} from "./design-system";

type PublicTab = "home" | "health" | "tests" | "care";

export function AdultJournalPreview({
    product,
    productId,
    fromDashboard = false,
}: {
    product?: Product;
    productId?: string;
    fromDashboard?: boolean;
}) {
    const [journal, setJournal] = useState<AdultJournalInformation>(emptyAdultJournalInformation);
    const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
    const [activeTab, setActiveTab] = useState<PublicTab>("health");
    const [identifierRevealed, setIdentifierRevealed] = useState(false);
    const headingRef = useRef<HTMLHeadingElement | null>(null);

    useEffect(() => {
        let active = true;
        async function loadJournal() {
            if (!productId) {
                setState("error");
                return;
            }
            try {
                const snapshot = await getDoc(doc(db, DB_COLLECTIONS.ADULT_JOURNALS, productId));
                if (!active) return;
                const normalized = normalizeAdultJournal(snapshot.exists() ? snapshot.data() : {});
                setJournal(normalized);
                setState(snapshot.exists() ? "ready" : "empty");
            } catch {
                if (active) setState("error");
            }
        }
        loadJournal();
        return () => {
            active = false;
        };
    }, [productId]);

    useEffect(() => {
        setIdentifierRevealed(false);
        headingRef.current?.focus();
    }, [activeTab, state]);

    useEffect(() => {
        const reMask = () => {
            if (document.hidden) setIdentifierRevealed(false);
        };
        document.addEventListener("visibilitychange", reMask);
        return () => document.removeEventListener("visibilitychange", reMask);
    }, []);

    if (state === "loading") {
        return (
            <div className="baby-journal-public-page">
                <LoadingPanel text="Loading protected record"/>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="baby-journal-public-page">
                <PublicState title="Health record unavailable" message="Refresh the page and try again."/>
            </div>
        );
    }

    return (
        <section className="baby-journal-public-page adult-journal-public-page" aria-label="Adult Journal">
            <div className="baby-journal-public-circles" aria-hidden="true"><span/><span/></div>
            <header className="baby-journal-public-header">
                <FlexPayzLogo className="baby-journal-public-logo"/>
                <div>
                    <span className="baby-journal-public-lock"><LockRoundedIcon fontSize="small"/> Protected</span>
                    <button type="button" onClick={() => navigator.share?.({title: "FlexPayz protected journal", url: window.location.href})}>
                        Share page <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                </div>
            </header>

            <main className="baby-journal-public-layout">
                <aside className="baby-journal-public-sidebar" aria-label="Adult Journal sections">
                    <AdultPublicIdentity journal={journal} product={product}/>
                    <AdultPublicTabs activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <div className="baby-journal-public-note">
                        <strong>Protected record</strong>
                        <span>Global access verified</span>
                    </div>
                </aside>

                <section className="baby-journal-public-main">
                    <AdultPublicTabs activeTab={activeTab} setActiveTab={setActiveTab} mobile/>
                    {activeTab === "home" && (
                        <AdultJournalPublicHome
                            journal={journal}
                            headingRef={headingRef}
                            identifierRevealed={identifierRevealed}
                            setIdentifierRevealed={setIdentifierRevealed}
                        />
                    )}
                    {activeTab === "health" && <AdultJournalPublicHealth journal={journal} headingRef={headingRef}/>}
                    {activeTab === "tests" && <AdultJournalPublicTests journal={journal} headingRef={headingRef}/>}
                    {activeTab === "care" && <AdultJournalPublicCare journal={journal} headingRef={headingRef}/>}
                    <footer className="baby-journal-public-bar">
                        <span>Identifiers and documents remain protected after global access verification.</span>
                        {fromDashboard && <BackButton aria-label="Back to content" href={`/show-product?product_id=${productId}`}/>}
                    </footer>
                </section>
            </main>
        </section>
    );
}

function PublicState({title, message}: {title: string; message: string}) {
    return (
        <div className="baby-journal-public-state" role="status" aria-live="polite">
            <LockRoundedIcon/>
            <h1>{title}</h1>
            <p>{message}</p>
        </div>
    );
}

function AdultPublicIdentity({journal, product}: {journal: AdultJournalInformation; product?: Product}) {
    const photo = journal.profilePicture[0];
    return (
        <div className="baby-journal-public-identity">
            {photo ? <img src={photo.url} alt=""/> : <span aria-hidden="true">◒</span>}
            <p>{journal.name || product?.name || "Adult Journal"}</p>
            <strong>Adult Journal</strong>
            <small>Medical record · {journal.medicalRecordNumber || "Not assigned"}</small>
        </div>
    );
}

function AdultPublicTabs({activeTab, setActiveTab, mobile = false}: {activeTab: PublicTab; setActiveTab: (tab: PublicTab) => void; mobile?: boolean}) {
    return (
        <nav className={mobile ? "baby-journal-public-tabs adult-journal-public-tabs" : undefined} role="tablist" aria-label="Adult Journal public sections">
            <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><HomeRoundedIcon fontSize="small"/> Home</button>
            <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}><FavoriteBorderRoundedIcon fontSize="small"/> Health</button>
            <button type="button" role="tab" aria-selected={activeTab === "tests"} className={activeTab === "tests" ? "active" : ""} onClick={() => setActiveTab("tests")}><SearchRoundedIcon fontSize="small"/> Tests</button>
            <button type="button" role="tab" aria-selected={activeTab === "care"} className={activeTab === "care" ? "active" : ""} onClick={() => setActiveTab("care")}><AddRoundedIcon fontSize="small"/> Care</button>
        </nav>
    );
}

function AdultJournalPublicHome({
    journal,
    headingRef,
    identifierRevealed,
    setIdentifierRevealed,
}: {
    journal: AdultJournalInformation;
    headingRef: RefObject<HTMLHeadingElement>;
    identifierRevealed: boolean;
    setIdentifierRevealed: (value: boolean) => void;
}) {
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
    return (
        <>
            <section className="baby-journal-public-hero">
                <AdultPublicAvatar journal={journal}/>
                <div>
                    <p className="business-kicker">ADULT JOURNAL</p>
                    <h1 ref={headingRef} tabIndex={-1}>{journal.name || "Private health record"}</h1>
                    <p><strong>Born {formatAdultDate(journal.birthDate, "date pending")}</strong>{journal.gender ? ` · ${journal.gender}` : ""}{journal.bloodType ? ` · ${journal.bloodType}` : ""}{journal.medicalRecordNumber ? ` · ${journal.medicalRecordNumber}` : ""}</p>
                    <p>Personal ID {identifierRevealed ? journal.personalIdNumber || "Not recorded" : maskPersonalId(journal.personalIdNumber)}</p>
                    <button type="button" className="baby-journal-button secondary" onClick={() => setIdentifierRevealed(!identifierRevealed)}>
                        {identifierRevealed ? "Hide identifier" : "Reveal identifier"}
                    </button>
                </div>
            </section>

            <section className="baby-journal-public-snapshot" aria-label="Latest vital signs">
                <PublicMetric label="Blood pressure" value={latestVitals?.value.bloodPressure}/>
                <PublicMetric label="Pulse" value={latestVitals?.value.pulse}/>
                <PublicMetric label="Temperature" value={latestVitals?.value.temperature}/>
                <PublicMetric label="Respiratory rate" value={latestVitals?.value.respiratoryRate}/>
                <PublicMetric label="Latest date" value={latestVitals ? formatAdultDate(latestVitals.dateKey) : ""}/>
            </section>

            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">MEDICAL HISTORY</p>
                    <PublicInfoRow label="Current medication" value={journal.medication}/>
                    <PublicInfoRow label="Allergies" value={journal.allergies}/>
                    <PublicInfoRow label="Previous conditions" value={journal.previousConditions}/>
                    <PublicInfoRow label="Family history" value={journal.familyHistory}/>
                </section>
                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">RECENT RECORDS</p>
                    <PublicInfoRow label="Investigation records" value={String(investigationCount)}/>
                    <PublicInfoRow label="Health card" value={journal.europeanHealthCard.length ? "Protected file available" : "No file attached"}/>
                    <PublicInfoRow label="Address" value={journal.address}/>
                </section>
            </div>
        </>
    );
}

function AdultJournalPublicHealth({journal, headingRef}: {journal: AdultJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const latestVitals = useMemo(() => getLatestVitalSigns(journal.vitalSigns), [journal.vitalSigns]);
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">HEALTH OVERVIEW</p>
                <h1 ref={headingRef} tabIndex={-1}>Health overview</h1>
                <p>Readable history, current care context and latest measurements.</p>
            </section>
            <section className="baby-journal-public-snapshot" aria-label="Latest vital signs">
                <PublicMetric label="Blood pressure" value={latestVitals?.value.bloodPressure}/>
                <PublicMetric label="Pulse" value={latestVitals?.value.pulse}/>
                <PublicMetric label="Temperature" value={latestVitals?.value.temperature}/>
                <PublicMetric label="Respiratory rate" value={latestVitals?.value.respiratoryRate}/>
                <PublicMetric label="Latest date" value={latestVitals ? formatAdultDate(latestVitals.dateKey) : ""}/>
            </section>
            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">MEDICAL HISTORY</p>
                    <PublicInfoRow label="Current medication" value={journal.medication}/>
                    <PublicInfoRow label="Allergies" value={journal.allergies}/>
                    <PublicInfoRow label="Previous conditions" value={journal.previousConditions}/>
                    <PublicInfoRow label="Family history" value={journal.familyHistory}/>
                    <PublicInfoRow label="General examination" value={journal.generalPhysicalExamination}/>
                </section>
                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">PROTECTED DOCUMENTS</p>
                    <PublicInfoRow label="European Health Card" value={journal.europeanHealthCard.length ? `${journal.europeanHealthCard.length} protected file` : "No file attached"}/>
                    <PublicInfoRow label="Phone" value={journal.phone}/>
                    <PublicInfoRow label="Record number" value={journal.medicalRecordNumber}/>
                </section>
            </div>
        </>
    );
}

function AdultJournalPublicTests({journal, headingRef}: {journal: AdultJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">INVESTIGATIONS</p>
                <h1 ref={headingRef} tabIndex={-1}>Find a record quickly</h1>
                <p>Investigation categories stay grouped without changing the stored field names.</p>
            </section>
            <div className="baby-journal-public-grid">
                {investigationGroups.map((group) => (
                    <section className="baby-journal-public-card" key={group.id}>
                        <p className="business-kicker">{group.label.toUpperCase()}</p>
                        {group.fields.map(([field, label]) => (
                            <PublicInvestigationSummary key={field} label={label} records={journal[field]}/>
                        ))}
                    </section>
                ))}
            </div>
        </>
    );
}

function AdultJournalPublicCare({journal, headingRef}: {journal: AdultJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const consultationDates = sortAdultDateKeysNewestFirst(Object.keys(journal.consultations));
    const followUpDates = sortAdultDateKeysNewestFirst(Object.keys(journal.followUp));
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">CARE</p>
                <h1 ref={headingRef} tabIndex={-1}>Care and procedures</h1>
                <p>Consultations, treatment and follow-up remain easy to scan.</p>
            </section>
            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">CONSULTATIONS</p>
                    {consultationDates.length === 0 ? <EmptyPublicRecord message="No consultations recorded yet."/> : consultationDates.map((dateKey) => (
                        <div className="baby-journal-health-public-row" key={dateKey}>
                            <span aria-hidden="true"><CheckRoundedIcon fontSize="small"/></span>
                            <div>
                                <strong>{formatAdultDate(dateKey)}</strong>
                                <p>{journal.consultations[dateKey].interdisciplinaryConsultation || "Consultation"}</p>
                                <p>{journal.consultations[dateKey].recommendation || "No recommendation recorded"}</p>
                            </div>
                        </div>
                    ))}
                </section>
                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">FOLLOW-UP</p>
                    {followUpDates.length === 0 ? <EmptyPublicRecord message="No follow-up recorded yet."/> : followUpDates.map((dateKey) => (
                        <div className="baby-journal-health-public-row" key={dateKey}>
                            <span aria-hidden="true"><CheckRoundedIcon fontSize="small"/></span>
                            <div>
                                <strong>{formatAdultDate(dateKey)}</strong>
                                <p>{journal.followUp[dateKey].appointments || "No appointment recorded"}</p>
                                <p>{journal.followUp[dateKey].monitoringProgress || "No monitoring note recorded"}</p>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
            <section className="baby-journal-public-card">
                <p className="business-kicker">CARE PLAN</p>
                {careSections.map(([field, label]) => (
                    <PublicInvestigationSummary key={field} label={label} records={journal[field]}/>
                ))}
            </section>
        </>
    );
}

function AdultPublicAvatar({journal}: {journal: AdultJournalInformation}) {
    const photo = journal.profilePicture[0];
    return photo ? <img className="baby-journal-public-avatar" src={photo.url} alt=""/> : <span className="baby-journal-public-avatar" aria-hidden="true">◒</span>;
}

function PublicMetric({label, value}: {label: string; value?: string}) {
    return (
        <div>
            <strong>{value || "—"}</strong>
            <span>{label}</span>
        </div>
    );
}

function PublicInfoRow({label, value}: {label: string; value: string}) {
    return (
        <div className="baby-journal-public-info-row">
            <span>{label}</span>
            <strong>{value || "Not recorded"}</strong>
        </div>
    );
}

function PublicInvestigationSummary({label, records}: {label: string; records: Record<string, Investigation>}) {
    const count = countInvestigationRecords(records);
    const dates = sortAdultDateKeysNewestFirst(Object.keys(records));
    return (
        <div className="baby-journal-health-public-row">
            <span aria-hidden="true">{count > 0 ? <CheckRoundedIcon fontSize="small"/> : "!"}</span>
            <div>
                <strong>{label}</strong>
                <p>{count > 0 ? `${count} dated record${count === 1 ? "" : "s"} · ${countInvestigationAssets(records)} file${countInvestigationAssets(records) === 1 ? "" : "s"} · latest ${formatAdultDate(dates[0])}` : "Nothing recorded"}</p>
            </div>
        </div>
    );
}

function EmptyPublicRecord({message}: {message: string}) {
    return <p className="baby-journal-public-empty">{message}</p>;
}
