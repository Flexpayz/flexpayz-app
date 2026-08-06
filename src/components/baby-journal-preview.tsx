import {useEffect, useMemo, useRef, useState} from "react";
import type {RefObject} from "react";
import {CircularProgress} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {doc, getDoc} from "firebase/firestore";
import {db} from "../App";
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
import {DB_COLLECTIONS, BabyJournalInformation} from "./baby-journal-settings";
import {BackButton, FlexPayzLogo} from "./design-system";

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

    useEffect(() => {
        let active = true;
        async function loadJournal() {
            if (!productId) {
                setState("error");
                return;
            }
            try {
                const snapshot = await getDoc(doc(db, DB_COLLECTIONS.BABY_JOURNALS, productId));
                if (!active) return;
                if (!snapshot.exists()) {
                    setJournal(normalizeBabyJournal({}));
                    setState("empty");
                    return;
                }
                setJournal(normalizeBabyJournal(snapshot.data()));
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
                <PublicState title="Loading protected journal" message="Preparing the family journal." loading/>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="baby-journal-public-page">
                <PublicState title="Journal unavailable" message="Refresh the page and try again."/>
            </div>
        );
    }

    const safeJournal = journal || normalizeBabyJournal({});

    return (
        <section className="baby-journal-public-page" aria-label="Baby Journal">
            <div className="baby-journal-public-circles" aria-hidden="true"><span/><span/></div>
            <header className="baby-journal-public-header">
                <FlexPayzLogo className="baby-journal-public-logo"/>
                <div>
                    <span className="baby-journal-public-lock"><LockRoundedIcon fontSize="small"/> Protected</span>
                    <button type="button" onClick={() => navigator.share?.({title: `${safeJournal.name || product?.name || "Baby Journal"}`, url: window.location.href})}>
                        Share page <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                </div>
            </header>

            <main className="baby-journal-public-layout">
                <aside className="baby-journal-public-sidebar" aria-label="Journal sections">
                    <BabyPublicIdentity journal={safeJournal}/>
                    <nav role="tablist" aria-label="Baby Journal public sections">
                        <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><HomeRoundedIcon fontSize="small"/> Home</button>
                        <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}><FavoriteBorderRoundedIcon fontSize="small"/> Health</button>
                    </nav>
                    <div className="baby-journal-public-note">
                        <strong>Protected journal</strong>
                        <span>Global access verified</span>
                    </div>
                </aside>

                <section className="baby-journal-public-main">
                    <div className="baby-journal-public-tabs" role="tablist" aria-label="Baby Journal public sections">
                        <button type="button" role="tab" aria-selected={activeTab === "home"} className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}><HomeRoundedIcon fontSize="small"/> Home</button>
                        <button type="button" role="tab" aria-selected={activeTab === "health"} className={activeTab === "health" ? "active" : ""} onClick={() => setActiveTab("health")}><FavoriteBorderRoundedIcon fontSize="small"/> Health</button>
                    </div>
                    {activeTab === "home" ? (
                        <BabyJournalPublicHome journal={safeJournal} headingRef={headingRef}/>
                    ) : (
                        <BabyJournalPublicHealth journal={safeJournal} headingRef={headingRef}/>
                    )}
                    <footer className="baby-journal-public-bar">
                        <span>Private information is shown only after global access verification.</span>
                        {fromDashboard && <BackButton aria-label="Back to content" href={`/show-product?product_id=${productId}`}/>}
                    </footer>
                </section>
            </main>
        </section>
    );
}

function PublicState({title, message, loading = false}: {title: string; message: string; loading?: boolean}) {
    return (
        <div className="baby-journal-public-state" role="status" aria-live="polite">
            {loading ? <CircularProgress size={28}/> : <LockRoundedIcon/>}
            <h1>{title}</h1>
            <p>{message}</p>
        </div>
    );
}

function BabyPublicIdentity({journal}: {journal: BabyJournalInformation}) {
    const photo = journal.profilePicture[0];
    return (
        <div className="baby-journal-public-identity">
            {photo ? <img src={photo.url} alt=""/> : <span aria-hidden="true">⌒</span>}
            <p>{journal.name || "Baby Journal"}</p>
            <strong>Baby Journal</strong>
        </div>
    );
}

function BabyJournalPublicHome({journal, headingRef}: {journal: BabyJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    const milestones = useMemo(() => getDatedMilestones(journal), [journal]);
    const latestSleep = useMemo(() => getLatestSleepEntry(journal.sleepSchedule), [journal.sleepSchedule]);
    return (
        <>
            <section className="baby-journal-public-hero">
                <BabyPublicAvatar journal={journal}/>
                <div>
                    <p className="business-kicker">BABY JOURNAL</p>
                    <h1 ref={headingRef} tabIndex={-1}>{journal.name || "Family journal"}</h1>
                    <p><strong>Born {formatJournalDate(journal.birthDate, "date pending")}</strong>{deriveBabyAgeLabel(journal.birthDate) ? ` · ${deriveBabyAgeLabel(journal.birthDate)}` : ""}{journal.gender ? ` · ${journal.gender}` : ""}{journal.bloodType ? ` · ${journal.bloodType}` : ""}</p>
                    {journal.biography && <p>{journal.biography}</p>}
                </div>
            </section>

            <section className="baby-journal-public-snapshot" aria-label="Birth snapshot">
                <PublicMetric label="Time of birth" value={journal.timeOfBirth}/>
                <PublicMetric label="APGAR" value={journal.apgar}/>
                <PublicMetric label="Weight" value={journal.weightOnBirth}/>
                <PublicMetric label="Height" value={journal.heightOnBirth}/>
                <PublicMetric label="Birthplace" value={journal.placeOfBirth}/>
            </section>

            <div className="baby-journal-public-grid">
                <section className="baby-journal-public-card">
                    <p className="business-kicker">PHYSICAL MILESTONES</p>
                    {milestones.length > 0 ? milestones.map((milestone) => (
                        <div className="baby-journal-public-timeline-row" key={milestone.field}>
                            <span aria-hidden="true"/>
                            <div>
                                <strong>{milestone.label}</strong>
                                <p>{formatJournalDate(milestone.value)}</p>
                            </div>
                        </div>
                    )) : <EmptyPublicRecord message="No milestones recorded yet."/>}
                </section>

                <section className="baby-journal-public-card accent">
                    <p className="business-kicker">LATEST SLEEP ENTRY</p>
                    {latestSleep ? (
                        <>
                            <strong>{formatJournalDate(latestSleep.dateKey)}</strong>
                            <PublicInfoRow label="Day sleep" value={latestSleep.value.daySleeping}/>
                            <PublicInfoRow label="Night sleep" value={latestSleep.value.nightSleeping}/>
                            <PublicInfoRow label="Ways of sleeping" value={latestSleep.value.waysOfSleeping}/>
                            <PublicInfoRow label="Progress" value={latestSleep.value.nightSleepingProgress}/>
                        </>
                    ) : <EmptyPublicRecord message="No sleep entries recorded yet."/>}
                </section>
            </div>

            <section className="baby-journal-public-card">
                <p className="business-kicker">FEEDING NOTES</p>
                <PublicInfoRow label="First breastfeeding" value={journal.firstBreastfeeding}/>
                <PublicInfoRow label="First formula" value={journal.firstFormula}/>
                <PublicInfoRow label="First solid feeding" value={journal.firstSolidFeeding}/>
                <PublicInfoRow label="Food preferences" value={journal.foodPreferences}/>
                <PublicInfoRow label="Food aversions" value={journal.foodAversions}/>
            </section>
        </>
    );
}

function BabyJournalPublicHealth({journal, headingRef}: {journal: BabyJournalInformation; headingRef: RefObject<HTMLHeadingElement>}) {
    return (
        <>
            <section className="baby-journal-public-section-heading">
                <p className="business-kicker">HEALTH TAB</p>
                <h1 ref={headingRef} tabIndex={-1}>Health overview</h1>
                <p>Health Card and parent profiles continue below.</p>
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
                {journal.otherHealthConditions && <PublicInfoRow label="Other health conditions" value={journal.otherHealthConditions}/>}
            </section>

            <div className="baby-journal-public-grid">
                <ParentPublicCard title="Mother" parent={journal.mother}/>
                <ParentPublicCard title="Father" parent={journal.father}/>
            </div>

            <section className="baby-journal-public-card accent">
                <p className="business-kicker">MEDICAL FILES</p>
                <PublicInfoRow label="Medical records" value={journal.medicalRecords.length ? `${journal.medicalRecords.length} files protected` : "No medical files attached"}/>
                <PublicInfoRow label="European Health Card" value={journal.europeanHealthCard.length ? "Protected file available" : "No file attached"}/>
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
    return (
        <div className="baby-journal-public-info-row">
            <span>{label}</span>
            <strong>{value || "Not recorded"}</strong>
        </div>
    );
}

function EmptyPublicRecord({message}: {message: string}) {
    return <p className="baby-journal-public-empty">{message}</p>;
}

function ParentPublicCard({title, parent}: {title: string; parent: BabyJournalInformation["mother"]}) {
    return (
        <section className="baby-journal-public-card">
            <p className="business-kicker">{title.toUpperCase()}</p>
            <PublicInfoRow label="Name" value={parent.name}/>
            <PublicInfoRow label="Blood type" value={parent.bloodType}/>
            <PublicInfoRow label="Allergies" value={parent.allergies}/>
            <PublicInfoRow label="Diseases" value={parent.diseases}/>
            <PublicInfoRow label="Chronic adverse reactions" value={parent.chronicAversions}/>
        </section>
    );
}
