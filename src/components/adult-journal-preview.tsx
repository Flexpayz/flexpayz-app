import {useEffect, useMemo, useRef, useState} from "react";
import type {RefObject} from "react";
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
import {BackButton, LoadingPanel} from "./design-system";
import {PublicPageHeader} from "./public-page-header";
import {usePublicLanguage, withPublicLanguageParam} from "../public-i18n";

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
    const {language, t} = usePublicLanguage();

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
                <LoadingPanel text={t("journal.loadingAdult")}/>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="baby-journal-public-page">
                <PublicState title={t("journal.unavailableHealth")} message={t("journal.refresh")}/>
            </div>
        );
    }

    return (
        <section className="baby-journal-public-page adult-journal-public-page" aria-label={t("journal.adultAria")}>
            <div className="baby-journal-public-circles" aria-hidden="true"><span/><span/></div>
            <PublicPageHeader productId={productId || ""} fromDashboard={fromDashboard} shareTitle="FlexPayz protected journal"/>

            <main className="baby-journal-public-layout">
                <aside className="baby-journal-public-sidebar" aria-label={t("journal.adultSections")}>
                    <AdultPublicIdentity journal={journal} product={product}/>
                    <AdultPublicTabs activeTab={activeTab} setActiveTab={setActiveTab}/>
                    <div className="baby-journal-public-note">
                        <strong>{t("journal.protectedRecord")}</strong>
                        <span>{t("journal.accessVerified")}</span>
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
                        <span>{t("journal.identifierFooter")}</span>
                        {fromDashboard && <BackButton aria-label={t("public.back.content")} href={withPublicLanguageParam(`/show-product?product_id=${productId}`, language)}/>}
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
    const {t} = usePublicLanguage();
    return (
        <div className="baby-journal-public-identity">
            {photo ? <img src={photo.url} alt=""/> : <span aria-hidden="true">◒</span>}
            <p>{journal.name || product?.name || t("section.adultJournal.title")}</p>
            <strong>{t("section.adultJournal.title")}</strong>
            <small>{t("journal.medicalRecord")} · {journal.medicalRecordNumber || t("journal.notAssigned")}</small>
        </div>
    );
}

function AdultPublicTabs({activeTab, setActiveTab, mobile = false}: {activeTab: PublicTab; setActiveTab: (tab: PublicTab) => void; mobile?: boolean}) {
    const {t} = usePublicLanguage();
    return (
        <nav className={mobile ? "baby-journal-public-tabs adult-journal-public-tabs" : undefined} role="tablist" aria-label={t("journal.adultSections")}>
            <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><HomeRoundedIcon fontSize="small"/> {t("journal.home")}</button>
            <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}><FavoriteBorderRoundedIcon fontSize="small"/> {t("journal.health")}</button>
            <button type="button" role="tab" aria-selected={activeTab === "tests"} className={activeTab === "tests" ? "active" : ""} onClick={() => setActiveTab("tests")}><SearchRoundedIcon fontSize="small"/> {t("journal.tests")}</button>
            <button type="button" role="tab" aria-selected={activeTab === "care"} className={activeTab === "care" ? "active" : ""} onClick={() => setActiveTab("care")}><AddRoundedIcon fontSize="small"/> {t("journal.care")}</button>
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
    const {t} = usePublicLanguage();
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
                    <p className="business-kicker">{t("section.adultJournal.title").toUpperCase()}</p>
                    <h1 ref={headingRef} tabIndex={-1}>{journal.name || t("journal.adultFallback")}</h1>
                    <p><strong>{t("journal.born", {date: formatAdultDate(journal.birthDate, t("journal.birthPending"))})}</strong>{journal.gender ? ` · ${journal.gender}` : ""}{journal.bloodType ? ` · ${journal.bloodType}` : ""}{journal.medicalRecordNumber ? ` · ${journal.medicalRecordNumber}` : ""}</p>
                    <p>{t("journal.personalId", {value: identifierRevealed ? journal.personalIdNumber || t("journal.notRecorded") : maskPersonalId(journal.personalIdNumber)})}</p>
                    <button type="button" className="baby-journal-button secondary" onClick={() => setIdentifierRevealed(!identifierRevealed)}>
                        {identifierRevealed ? t("journal.hideIdentifier") : t("journal.revealIdentifier")}
                    </button>
                </div>
            </section>

            <section className="baby-journal-public-snapshot" aria-label={t("journal.latestVitals")}>
                <PublicMetric label={t("journal.bloodPressure")} value={latestVitals?.value.bloodPressure}/>
                <PublicMetric label={t("journal.pulse")} value={latestVitals?.value.pulse}/>
                <PublicMetric label={t("journal.temperature")} value={latestVitals?.value.temperature}/>
                <PublicMetric label={t("journal.respiratoryRate")} value={latestVitals?.value.respiratoryRate}/>
                <PublicMetric label={t("journal.latestDate")} value={latestVitals ? formatAdultDate(latestVitals.dateKey) : ""}/>
            </section>

            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">{t("journal.medicalHistory")}</p>
                    <PublicInfoRow label={t("journal.currentMedication")} value={journal.medication}/>
                    <PublicInfoRow label={t("journal.allergies")} value={journal.allergies}/>
                    <PublicInfoRow label={t("journal.previousConditions")} value={journal.previousConditions}/>
                    <PublicInfoRow label={t("journal.familyHistory")} value={journal.familyHistory}/>
                </section>
                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">{t("journal.recentRecords")}</p>
                    <PublicInfoRow label={t("journal.investigationRecords")} value={String(investigationCount)}/>
                    <PublicInfoRow label={t("journal.healthCard")} value={journal.europeanHealthCard.length ? t("journal.fileAvailable") : t("journal.noFiles")}/>
                    <PublicInfoRow label={t("journal.address")} value={journal.address}/>
                </section>
            </div>
        </>
    );
}

function AdultJournalPublicHealth({journal, headingRef}: {journal: AdultJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const latestVitals = useMemo(() => getLatestVitalSigns(journal.vitalSigns), [journal.vitalSigns]);
    const {t} = usePublicLanguage();
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">{t("journal.healthOverview").toUpperCase()}</p>
                <h1 ref={headingRef} tabIndex={-1}>{t("journal.healthOverview")}</h1>
                <p>{t("journal.healthAdultIntro")}</p>
            </section>
            <section className="baby-journal-public-snapshot" aria-label={t("journal.latestVitals")}>
                <PublicMetric label={t("journal.bloodPressure")} value={latestVitals?.value.bloodPressure}/>
                <PublicMetric label={t("journal.pulse")} value={latestVitals?.value.pulse}/>
                <PublicMetric label={t("journal.temperature")} value={latestVitals?.value.temperature}/>
                <PublicMetric label={t("journal.respiratoryRate")} value={latestVitals?.value.respiratoryRate}/>
                <PublicMetric label={t("journal.latestDate")} value={latestVitals ? formatAdultDate(latestVitals.dateKey) : ""}/>
            </section>
            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">{t("journal.medicalHistory")}</p>
                    <PublicInfoRow label={t("journal.currentMedication")} value={journal.medication}/>
                    <PublicInfoRow label={t("journal.allergies")} value={journal.allergies}/>
                    <PublicInfoRow label={t("journal.previousConditions")} value={journal.previousConditions}/>
                    <PublicInfoRow label={t("journal.familyHistory")} value={journal.familyHistory}/>
                    <PublicInfoRow label="General examination" value={journal.generalPhysicalExamination}/>
                </section>
                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">{t("journal.protectedDocuments")}</p>
                    <PublicInfoRow label={t("journal.healthCard")} value={journal.europeanHealthCard.length ? t("journal.filesProtected", {count: journal.europeanHealthCard.length}) : t("journal.noFiles")}/>
                    <PublicInfoRow label={t("journal.phone")} value={journal.phone}/>
                    <PublicInfoRow label={t("journal.recordNumber")} value={journal.medicalRecordNumber}/>
                </section>
            </div>
        </>
    );
}

function AdultJournalPublicTests({journal, headingRef}: {journal: AdultJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const {t} = usePublicLanguage();
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">{t("journal.investigations")}</p>
                <h1 ref={headingRef} tabIndex={-1}>{t("journal.findRecord")}</h1>
                <p>{t("journal.investigationIntro")}</p>
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
    const {t} = usePublicLanguage();
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">{t("journal.care").toUpperCase()}</p>
                <h1 ref={headingRef} tabIndex={-1}>{t("journal.careHeading")}</h1>
                <p>{t("journal.careIntro")}</p>
            </section>
            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">{t("journal.consultations")}</p>
                    {consultationDates.length === 0 ? <EmptyPublicRecord message={t("journal.noConsultations")}/> : consultationDates.map((dateKey) => (
                        <div className="baby-journal-health-public-row" key={dateKey}>
                            <span aria-hidden="true"><CheckRoundedIcon fontSize="small"/></span>
                            <div>
                                <strong>{formatAdultDate(dateKey)}</strong>
                                <p>{journal.consultations[dateKey].interdisciplinaryConsultation || t("journal.consultation")}</p>
                                <p>{journal.consultations[dateKey].recommendation || t("journal.noRecommendation")}</p>
                            </div>
                        </div>
                    ))}
                </section>
                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">{t("journal.followUp")}</p>
                    {followUpDates.length === 0 ? <EmptyPublicRecord message={t("journal.noFollowUp")}/> : followUpDates.map((dateKey) => (
                        <div className="baby-journal-health-public-row" key={dateKey}>
                            <span aria-hidden="true"><CheckRoundedIcon fontSize="small"/></span>
                            <div>
                                <strong>{formatAdultDate(dateKey)}</strong>
                                <p>{journal.followUp[dateKey].appointments || t("journal.noAppointment")}</p>
                                <p>{journal.followUp[dateKey].monitoringProgress || t("journal.noMonitoring")}</p>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
            <section className="baby-journal-public-card">
                <p className="business-kicker">{t("journal.carePlan")}</p>
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
    const {t} = usePublicLanguage();
    return (
        <div className="baby-journal-public-info-row">
            <span>{label}</span>
            <strong>{value || t("journal.notRecorded")}</strong>
        </div>
    );
}

function PublicInvestigationSummary({label, records}: {label: string; records: Record<string, Investigation>}) {
    const count = countInvestigationRecords(records);
    const dates = sortAdultDateKeysNewestFirst(Object.keys(records));
    const {t} = usePublicLanguage();
    return (
        <div className="baby-journal-health-public-row">
            <span aria-hidden="true">{count > 0 ? <CheckRoundedIcon fontSize="small"/> : "!"}</span>
            <div>
                <strong>{label}</strong>
                <p>{count > 0 ? t("journal.recordFileCount", {
                    count,
                    recordPlural: count === 1 ? "" : "s",
                    files: countInvestigationAssets(records),
                    filePlural: countInvestigationAssets(records) === 1 ? "" : "s",
                    date: formatAdultDate(dates[0]),
                }) : t("journal.nothingRecorded")}</p>
            </div>
        </div>
    );
}

function EmptyPublicRecord({message}: {message: string}) {
    return <p className="baby-journal-public-empty">{message}</p>;
}
