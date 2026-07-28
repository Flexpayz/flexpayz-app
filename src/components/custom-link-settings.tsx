import {FormEvent, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Box, CircularProgress, TextField} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {useNavigate} from "react-router";
import {db} from "../App";
import {Product, defaultProduct} from "../control-state";
import {ManageProductContext} from "../contexts";
import {buildCustomLinkUpdate, getCustomLinkDisplayLabel, parseCustomLink} from "../custom-link";
import {AppButton, FlexPayzLogo, PageShell} from "./design-system";
import {getProductIdFromURL} from "../utils";
import "../Pages/manager.css";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "failed";
const AUTOSAVE_DELAY = 1200;

export function CustomLinkSettingsWrapper() {
    const productId = getProductIdFromURL();
    const [productState, setProductState] = useState<Product>(defaultProduct);
    const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");

    useEffect(() => {
        let active = true;

        async function loadProduct() {
            if (!productId) {
                setStatus("not-found");
                return;
            }

            try {
                const snapshot = await getDoc(doc(db, "products", productId));
                if (!active) return;
                if (!snapshot.exists()) {
                    setStatus("not-found");
                    return;
                }
                setProductState((prev) => ({...prev, ...snapshot.data() as Product}));
                setStatus("ready");
            } catch {
                if (active) setStatus("error");
            }
        }

        loadProduct();
        return () => {
            active = false;
        };
    }, [productId]);

    return (
        <ManageProductContext.Provider value={{productState, setProductState, invalidFields: new Map()}}>
            {status === "ready" ? <CustomLinkSettings/> : <CustomLinkEditorState state={status}/>}
        </ManageProductContext.Provider>
    );
}

export function CustomLinkSettings() {
    const navigate = useNavigate();
    const productId = getProductIdFromURL();
    const {productState, setProductState} = useContext(ManageProductContext);
    const [draft, setDraft] = useState(productState.customLink || "");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveMessage, setSaveMessage] = useState("Autosave on");
    const [copyMessage, setCopyMessage] = useState("");
    const [tested, setTested] = useState(false);
    const autosaveTimer = useRef<number | undefined>();
    const lastSaved = useRef(productState.customLink || "");
    const result = useMemo(() => parseCustomLink(draft), [draft]);
    const liveResult = useMemo(() => parseCustomLink(productState.customLink), [productState.customLink]);
    const canSave = result.isValid && Boolean(result.normalizedUrl) && saveState !== "saving";

    useEffect(() => {
        if (!productId || !result.isValid || !result.normalizedUrl || result.normalizedUrl === lastSaved.current || saveState !== "dirty") return;

        window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(async () => {
            setSaveState("saving");
            setSaveMessage("Autosaving");
            try {
                await updateDoc(doc(db, "products", productId || ""), buildCustomLinkUpdate(draft));
                lastSaved.current = result.normalizedUrl || "";
                setProductState((prev: Product) => ({...prev, customLink: result.normalizedUrl || ""}));
                setSaveState("saved");
                setSaveMessage("Destination saved");
            } catch {
                setSaveState("failed");
                setSaveMessage("Save failed. Your draft is still here.");
            }
        }, AUTOSAVE_DELAY);

        return () => window.clearTimeout(autosaveTimer.current);
    }, [draft, productId, result.isValid, result.normalizedUrl, saveState, setProductState]);

    const updateDraft = (value: string) => {
        setDraft(value);
        setCopyMessage("");
        setSaveState("dirty");
        setSaveMessage("Unsaved destination");
    };

    const saveChanges = async (event?: FormEvent) => {
        event?.preventDefault();
        window.clearTimeout(autosaveTimer.current);
        if (!canSave || !productId) {
            setSaveState("failed");
            setSaveMessage(result.issue === "empty" ? "Enter the website or page this device should open." : "Fix the URL before saving.");
            return;
        }

        setSaveState("saving");
        setSaveMessage("Saving destination");
        try {
            const payload = buildCustomLinkUpdate(draft);
            await updateDoc(doc(db, "products", productId), payload);
            lastSaved.current = payload.customLink;
            setProductState((prev: Product) => ({...prev, customLink: payload.customLink}));
            setSaveState("saved");
            setSaveMessage("Destination saved");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your draft is still here.");
        }
    };

    const copyDestination = async () => {
        if (!result.normalizedUrl) return;
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error("Clipboard unavailable");
            }
            await navigator.clipboard.writeText(result.normalizedUrl);
            setCopyMessage("Destination copied");
        } catch {
            setCopyMessage("Copy failed. Select and copy the URL manually.");
        }
    };

    return (
        <PageShell bleed className="custom-link-editor-shell" sx={{py: 0}}>
            <Box className="custom-link-editor-layout">
                <aside className="custom-link-editor-sidebar" aria-label="Custom Link editor navigation">
                    <FlexPayzLogo className="business-editor-logo"/>
                    <div className="custom-link-editor-icon" aria-hidden="true">↗</div>
                    <p className="workspace-sidebar-kicker">{productState.name || "FlexPayz product"}</p>
                    <h2>Custom Link</h2>
                    <nav>
                        <a href={`/manage-device?product_id=${productId}`}>Overview</a>
                        <a href={`/manage-device?product_id=${productId}&tab=content`}>Content</a>
                        <a className="is-active" href="#custom-link-editor">Custom Link <ArrowForwardRoundedIcon fontSize="small"/></a>
                        <a href={`/manage-device?product_id=${productId}&tab=settings`}>Settings</a>
                    </nav>
                    <div className="custom-link-status-card">
                        <strong>{result.isValid ? "Ready to open" : "Needs destination"}</strong>
                        <span>{result.isValid ? "Destination validated" : "No public redirect will be saved."}</span>
                    </div>
                    <div className="business-autosave-card" aria-live="polite">
                        <strong>{saveState === "failed" ? "Needs attention" : "Autosave on"}</strong>
                        <span>{saveMessage}</span>
                    </div>
                </aside>

                <main id="custom-link-editor" className="custom-link-editor-main">
                    <header className="business-editor-header">
                        <button className="business-icon-button" type="button" aria-label="Back to device workspace" onClick={() => navigate(`/manage-device?product_id=${productId}`)}>
                            <ArrowBackRoundedIcon/>
                        </button>
                        <div>
                            <p className="business-kicker">CUSTOM LINK SETTINGS</p>
                            <h1><span className="desktop-heading">Send visitors to the right place</span><span className="mobile-heading">Choose the destination</span></h1>
                            <p>Configure one external destination with clear validation before it goes live.</p>
                        </div>
                        <div className={`business-save-pill ${saveState}`} aria-live="polite">
                            {saveState === "saving" ? <CircularProgress size={16} color="inherit"/> : saveState === "saved" ? <CheckRoundedIcon fontSize="small"/> : null}
                            <span>{result.isValid ? "URL ready" : "Not ready"}</span>
                        </div>
                    </header>

                    <form className="custom-link-form" onSubmit={saveChanges}>
                        <section className="custom-link-section">
                            <p className="business-kicker">01 · DESTINATION</p>
                            <h2>Where should this device open?</h2>
                            <div className="custom-link-input-row">
                                <TextField
                                    label="Destination URL"
                                    value={draft}
                                    onChange={(event) => updateDraft(event.target.value)}
                                    error={!result.isValid && result.issue !== "empty"}
                                    helperText={getHelperText(result.issue)}
                                    fullWidth
                                    size="small"
                                    inputMode="url"
                                    autoComplete="url"
                                />
                                {result.isValid && <span className={`custom-link-protocol ${result.isSecure ? "secure" : "warning"}`}>{result.isSecure ? "HTTPS" : "HTTP"}</span>}
                                <a
                                    className={`custom-link-action ${!result.isValid ? "disabled" : ""}`}
                                    href={result.normalizedUrl || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-disabled={!result.isValid}
                                    onClick={(event) => {
                                        if (!result.isValid) event.preventDefault();
                                        else setTested(true);
                                    }}
                                >
                                    Test link <OpenInNewRoundedIcon fontSize="small"/>
                                </a>
                                <button className="custom-link-action" type="button" onClick={copyDestination} disabled={!result.isValid}>
                                    Copy <ContentCopyRoundedIcon fontSize="small"/>
                                </button>
                            </div>
                            {copyMessage && <p className="custom-link-live" role="status">{copyMessage}</p>}
                        </section>

                        <div className="custom-link-grid">
                            <section className="custom-link-destination-card">
                                <p className="business-kicker">DETECTED DESTINATION</p>
                                <div>
                                    <span className="custom-link-round-icon" aria-hidden="true">↗</span>
                                    <div>
                                        <h2>{result.isValid ? getCustomLinkDisplayLabel(result) : "No valid destination"}</h2>
                                        {result.displayHostname && <strong>{result.displayHostname}</strong>}
                                        {result.path && <span>{result.path}</span>}
                                    </div>
                                    {result.isValid && <em>{result.isSecure ? "HTTPS SECURE" : "HTTP · NOT SECURE"}</em>}
                                </div>
                                {!result.isSecure && result.isValid && <p className="custom-link-warning"><WarningAmberRoundedIcon fontSize="small"/> This legacy HTTP destination remains usable, but HTTPS is recommended.</p>}
                                {result.protocolAdded && result.isValid && <p className="custom-link-normalized">Helpful, not technical · Saved as {result.normalizedUrl}</p>}
                            </section>

                            <section className="custom-link-checklist">
                                <p className="business-kicker">PUBLISH CHECKLIST</p>
                                <ChecklistItem complete={result.isSecure} title="Secure protocol" text={result.isSecure ? "HTTPS detected" : result.isValid ? "Legacy HTTP destination" : "HTTPS is added automatically when possible"}/>
                                <ChecklistItem complete={result.isValid} title="Valid domain" text={result.hostname || "Enter a domain such as ateliernorth.co."}/>
                                <ChecklistItem complete title="Redirect behavior" text="Immediate handoff"/>
                                <ChecklistItem complete={tested} title="Test destination" text={tested ? "Opened once from this editor" : "Open once before saving"}/>
                            </section>
                        </div>

                        <section className="custom-link-section custom-link-behaviour">
                            <p className="business-kicker">02 · BEHAVIOUR</p>
                            <h2>Simple and immediate</h2>
                            <div>
                                <span className="custom-link-round-icon" aria-hidden="true">↗</span>
                                <strong>Open immediately</strong>
                                <em>FIXED</em>
                            </div>
                            <p>Visitors are sent to the selected external destination after a brief FlexPayz handoff.</p>
                        </section>

                        <section className="custom-link-section custom-link-readiness">
                            <p className="business-kicker">03 · READINESS</p>
                            <h2>{result.isValid ? "URL ready" : "Fix it before saving"}</h2>
                            <p>{result.isValid ? "Destination is valid and ready to publish" : "Enter a domain such as ateliernorth.co."}</p>
                            {liveResult.isValid && !result.isValid && <small>Current live URL remains unchanged: {liveResult.displayHostname}</small>}
                        </section>

                        <div className="business-save-bar" aria-live="polite">
                            <span>{saveMessage}</span>
                            <AppButton type="submit" variant="contained" disabled={!canSave} endIcon={saveState === "saving" ? <CircularProgress size={18} color="inherit"/> : <ArrowForwardRoundedIcon/>}>
                                Save changes
                            </AppButton>
                        </div>
                    </form>
                </main>
            </Box>
        </PageShell>
    );
}

function ChecklistItem({complete, title, text}: {complete: boolean; title: string; text: string}) {
    return (
        <div className={`custom-link-check-item ${complete ? "complete" : ""}`}>
            <span>{complete ? "✓" : "!"}</span>
            <div>
                <strong>{title}</strong>
                <small>{text}</small>
            </div>
        </div>
    );
}

function CustomLinkEditorState({state}: {state: "loading" | "not-found" | "error"}) {
    return (
        <PageShell bleed className="custom-link-editor-shell">
            <div className="business-editor-state" role={state === "loading" ? "status" : "alert"}>
                <FlexPayzLogo/>
                {state === "loading" ? <CircularProgress size={28}/> : null}
                <h1>{state === "loading" ? "Loading Custom Link" : state === "not-found" ? "Device not found" : "Custom Link unavailable"}</h1>
                <p>{state === "loading" ? "Preparing your destination settings." : "Return to My Devices and try again."}</p>
            </div>
        </PageShell>
    );
}

function getHelperText(issue?: string) {
    if (!issue || issue === "empty") return "Paste a full URL or type a domain; HTTPS is added automatically.";
    if (issue === "unsupported-protocol") return "Only HTTP and HTTPS web links are supported.";
    if (issue === "credentials") return "Remove username or password details from the URL.";
    return "Enter a domain such as ateliernorth.co.";
}
