import {useEffect, useMemo, useRef, useState} from "react";
import type {RefObject} from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {Product} from "../control-state";
import {
    deriveBabyAgeLabel,
    formatJournalDate,
    getDatedMilestones,
    getLatestSleepEntry,
    healthCategories,
    normalizeBabyJournal,
    sortJournalDateKeysNewestFirst,
} from "../baby-journal";
import {BabyJournalInformation} from "./baby-journal-settings";
import {BackButton, LoadingPanel} from "./design-system";
import {PublicPageHeader} from "./public-page-header";
import {usePublicLanguage, withPublicLanguageParam} from "../public-i18n";
import {getBabyJournal} from "../firestore/repositories/journals";

type PublicTab = "home" | "health";

export function BabyJournalPreview({
    product,
    productId,
    fromDashboard = false,
}: {
    product?: Product;
    productId?: string;
    fromDashboard?: boolean;
}) {
    const [journal, setJournal] = useState<BabyJournalInformation | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
    const [activeTab, setActiveTab] = useState<PublicTab>("home");
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
                const normalized = await getBabyJournal(productId);
                if (!active) return;
                setJournal(normalized);
                setState("ready");
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
        headingRef.current?.focus();
    }, [activeTab, state]);

    if (state === "loading") {
        return (
            <div className="baby-journal-public-page">
                <LoadingPanel text={t("journal.loadingBaby")}/>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="baby-journal-public-page">
                <PublicState title={t("journal.unavailable")} message={t("journal.refresh")}/>
            </div>
        );
    }

    const safeJournal = journal || normalizeBabyJournal({});

    return (
        <section className="baby-journal-public-page" aria-label={t("journal.babyAria")}>
            <div className="baby-journal-public-circles" aria-hidden="true"><span/><span/></div>
            <PublicPageHeader productId={productId || ""} fromDashboard={fromDashboard} shareTitle={`${safeJournal.name || product?.name || t("section.babyJournal.title")}`}/>

            <main className="baby-journal-public-layout">
                <aside className="baby-journal-public-sidebar" aria-label={t("journal.sections")}>
                    <BabyPublicIdentity journal={safeJournal}/>
                    <nav role="tablist" aria-label={t("journal.babySections")}>
                        <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><HomeRoundedIcon fontSize="small"/> {t("journal.home")}</button>
                        <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}><FavoriteBorderRoundedIcon fontSize="small"/> {t("journal.health")}</button>
                    </nav>
                    <div className="baby-journal-public-note">
                        <strong>{t("journal.protectedJournal")}</strong>
                        <span>{t("journal.accessVerified")}</span>
                    </div>
                </aside>

                <section className="baby-journal-public-main">
                    <div className="baby-journal-public-tabs" role="tablist" aria-label={t("journal.babySections")}>
                        <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><HomeRoundedIcon fontSize="small"/> {t("journal.home")}</button>
                        <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}><FavoriteBorderRoundedIcon fontSize="small"/> {t("journal.health")}</button>
                    </div>
                    {activeTab === "home" ? (
                        <BabyJournalPublicHome journal={safeJournal} headingRef={headingRef}/>
                    ) : (
                        <BabyJournalPublicHealth journal={safeJournal} headingRef={headingRef}/>
                    )}
                    <footer className="baby-journal-public-bar">
                        <span>{t("journal.privateFooter")}</span>
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

function BabyPublicIdentity({journal}: {journal: BabyJournalInformation}) {
    const photo = journal.profilePicture[0];
    const {t} = usePublicLanguage();
    return (
        <div className="baby-journal-public-identity">
            {photo ? <img src={photo.url} alt=""/> : <span aria-hidden="true">⌒</span>}
            <p>{journal.name || t("section.babyJournal.title")}</p>
            <strong>{t("section.babyJournal.title")}</strong>
        </div>
    );
}

function BabyJournalPublicHome({journal, headingRef}: {journal: BabyJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const milestones = useMemo(() => getDatedMilestones(journal), [journal]);
    const latestSleep = useMemo(() => getLatestSleepEntry(journal.sleepSchedule), [journal.sleepSchedule]);
    const {t} = usePublicLanguage();
    return (
        <>
            <section className="baby-journal-public-hero">
                <BabyPublicAvatar journal={journal}/>
                <div>
                    <p className="business-kicker">{t("section.babyJournal.title").toUpperCase()}</p>
                    <h1 ref={headingRef} tabIndex={-1}>{journal.name || t("journal.familyFallback")}</h1>
                    <p><strong>{t("journal.born", {date: formatJournalDate(journal.birthDate, t("journal.birthPending"))})}</strong>{deriveBabyAgeLabel(journal.birthDate) ? ` · ${deriveBabyAgeLabel(journal.birthDate)}` : ""}{journal.gender ? ` · ${journal.gender}` : ""}{journal.bloodType ? ` · ${journal.bloodType}` : ""}</p>
                    {journal.biography && <p>{journal.biography}</p>}
                </div>
            </section>

            <section className="baby-journal-public-snapshot" aria-label={t("journal.birthSnapshot")}>
                <PublicMetric label={t("journal.timeOfBirth")} value={journal.timeOfBirth}/>
                <PublicMetric label="APGAR" value={journal.apgar}/>
                <PublicMetric label={t("journal.weight")} value={journal.weightOnBirth}/>
                <PublicMetric label={t("journal.height")} value={journal.heightOnBirth}/>
                <PublicMetric label={t("journal.birthplace")} value={journal.placeOfBirth}/>
            </section>

            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">{t("journal.physicalMilestones")}</p>
                    {milestones.length > 0 ? milestones.map((milestone) => (
                        <div className="baby-journal-public-timeline-row" key={milestone.field}>
                            <span aria-hidden="true"/>
                            <div>
                                <strong>{milestone.label}</strong>
                                <p>{formatJournalDate(milestone.value)}</p>
                            </div>
                        </div>
                    )) : <EmptyPublicRecord message={t("journal.noMilestones")}/>}
                </section>

                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">{t("journal.latestSleep")}</p>
                    {latestSleep ? (
                        <>
                            <strong>{formatJournalDate(latestSleep.dateKey)}</strong>
                            <PublicInfoRow label={t("journal.daySleep")} value={latestSleep.value.daySleeping}/>
                            <PublicInfoRow label={t("journal.nightSleep")} value={latestSleep.value.nightSleeping}/>
                            <PublicInfoRow label={t("journal.waysSleeping")} value={latestSleep.value.waysOfSleeping}/>
                            <PublicInfoRow label={t("journal.progress")} value={latestSleep.value.nightSleepingProgress}/>
                        </>
                    ) : <EmptyPublicRecord message={t("journal.noSleep")}/>}
                </section>
            </div>

            <section className="baby-journal-public-card">
                <p className="business-kicker">{t("journal.feeding")}</p>
                <PublicInfoRow label={t("journal.firstBreastfeeding")} value={journal.firstBreastfeeding}/>
                <PublicInfoRow label={t("journal.firstFormula")} value={journal.firstFormula}/>
                <PublicInfoRow label={t("journal.firstSolid")} value={journal.firstSolidFeeding}/>
                <PublicInfoRow label={t("journal.foodPreferences")} value={journal.foodPreferences}/>
                <PublicInfoRow label={t("journal.foodAversions")} value={journal.foodAversions}/>
            </section>
        </>
    );
}

function BabyJournalPublicHealth({journal, headingRef}: {journal: BabyJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const {t} = usePublicLanguage();
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">{t("journal.healthTab")}</p>
                <h1 ref={headingRef} tabIndex={-1}>{t("journal.healthOverview")}</h1>
                <p>{t("journal.healthBabyIntro")}</p>
            </section>

            <section className="baby-journal-public-card">
                {healthCategories.map((category) => {
                    const keys = sortJournalDateKeysNewestFirst(Object.keys(journal[category.field]));
                    return (
                        <div className="baby-journal-health-public-row" key={category.field}>
                            <span aria-hidden="true">{keys.length > 0 ? <CheckRoundedIcon fontSize="small"/> : "!"}</span>
                            <div>
                                <strong>{category.label}</strong>
                                <p>{keys.length > 0 ? `${keys.length} dated record${keys.length === 1 ? "" : "s"} · latest ${formatJournalDate(keys[0])}` : category.empty}</p>
                            </div>
                        </div>
                    );
                })}
                {journal.otherHealthConditions && <PublicInfoRow label={t("journal.otherHealth")} value={journal.otherHealthConditions}/>}
            </section>

            <div className="baby-journal-public-grid">
                <ParentPublicCard title={t("journal.mother")} parent={journal.mother}/>
                <ParentPublicCard title={t("journal.father")} parent={journal.father}/>
            </div>

            <section className="baby-journal-public-card accent">
                <p className="business-kicker">{t("journal.medicalFiles")}</p>
                <PublicInfoRow label={t("journal.medicalRecords")} value={journal.medicalRecords.length ? t("journal.filesProtected", {count: journal.medicalRecords.length}) : t("journal.noFiles")}/>
                <PublicInfoRow label={t("journal.healthCard")} value={journal.europeanHealthCard.length ? t("journal.fileAvailable") : t("journal.noFiles")}/>
            </section>
        </>
    );
}

function BabyPublicAvatar({journal}: {journal: BabyJournalInformation}) {
    const photo = journal.profilePicture[0];
    return photo ? <img className="baby-journal-public-avatar" src={photo.url} alt=""/> : <span className="baby-journal-public-avatar" aria-hidden="true">⌒</span>;
}

function PublicMetric({label, value}: {label: string; value: string}) {
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

function EmptyPublicRecord({message}: {message: string}) {
    return <p className="baby-journal-public-empty">{message}</p>;
}

function ParentPublicCard({title, parent}: {title: string; parent: BabyJournalInformation["mother"]}) {
    const {t} = usePublicLanguage();
    return (
        <section className="baby-journal-public-card">
            <p className="business-kicker">{title.toUpperCase()}</p>
            <PublicInfoRow label={t("journal.name")} value={parent.name}/>
            <PublicInfoRow label={t("journal.bloodType")} value={parent.bloodType}/>
            <PublicInfoRow label={t("journal.allergies")} value={parent.allergies}/>
            <PublicInfoRow label={t("journal.diseases")} value={parent.diseases}/>
            <PublicInfoRow label={t("journal.chronic")} value={parent.chronicAversions}/>
        </section>
    );
}
