import {FormEvent, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import YouTube from "react-youtube";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {useNavigate} from "react-router";
import {db} from "../App";
import {Product, defaultProduct} from "../control-state";
import {ManageProductContext} from "../contexts";
import {AppButton, BackButton, FlexPayzLogo, LoadingPanel, PageShell} from "./design-system";
import {getProductIdFromURL} from "../utils";
import {
    ParsedYouTubeUrl,
    YouTubeMetadataStatus,
    YouTubeVideoMetadata,
    fetchYouTubeMetadata,
    getFallbackYouTubeMetadata,
    getYouTubeInputError,
    parseYouTubeUrl,
} from "../youtube-video";
import "../Pages/manager.css";

type SaveState = "idle" | "dirty" | "checking" | "saving" | "saved" | "failed";
type PageStatus = "loading" | "ready" | "not-found" | "error";

export function UploadVideoSettingsWrapper() {
    const productId = getProductIdFromURL();
    const [productState, setProductState] = useState<Product>(defaultProduct);
    const [status, setStatus] = useState<PageStatus>("loading");

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
            {status === "ready" ? <UploadVideoSettings/> : <UploadVideoEditorState state={status}/>}
        </ManageProductContext.Provider>
    );
}

export function UploadVideoSettings() {
    const navigate = useNavigate();
    const productId = getProductIdFromURL();
    const {productState, setProductState} = useContext(ManageProductContext);
    const savedParsed = useMemo(() => parseYouTubeUrl(productState.youtubeLink || ""), [productState.youtubeLink]);
    const [draft, setDraft] = useState(productState.youtubeLink || "");
    const draftParsed = useMemo(() => parseYouTubeUrl(draft), [draft]);
    const inputError = useMemo(() => getYouTubeInputError(draft), [draft]);
    const [checkedParsed, setCheckedParsed] = useState<ParsedYouTubeUrl | null>(savedParsed);
    const [metadata, setMetadata] = useState<YouTubeVideoMetadata | null>(savedParsed ? getFallbackYouTubeMetadata(savedParsed) : null);
    const [metadataStatus, setMetadataStatus] = useState<YouTubeMetadataStatus>(savedParsed ? "found" : "idle");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveMessage, setSaveMessage] = useState(savedParsed ? "Video ready" : "No video configured");
    const [removeOpen, setRemoveOpen] = useState(false);
    const liveRegionRef = useRef<HTMLParagraphElement | null>(null);

    const normalizedDraft = draftParsed?.canonicalUrl || "";
    const savedCanonical = savedParsed?.canonicalUrl || "";
    const hasStagedRemoval = saveState === "dirty" && !draft.trim() && Boolean(productState.youtubeLink);
    const hasCheckedChange = Boolean(checkedParsed && checkedParsed.canonicalUrl !== savedCanonical);
    const hasRemovalChange = !checkedParsed && !draft.trim() && Boolean(productState.youtubeLink);
    const canCheck = Boolean(draftParsed) && normalizedDraft !== checkedParsed?.canonicalUrl && saveState !== "checking";
    const canSave = saveState !== "saving" && (hasCheckedChange || hasRemovalChange);

    useEffect(() => {
        setDraft(productState.youtubeLink || "");
        const parsed = parseYouTubeUrl(productState.youtubeLink || "");
        setCheckedParsed(parsed);
        setMetadata(parsed ? getFallbackYouTubeMetadata(parsed) : null);
        setMetadataStatus(parsed ? "found" : "idle");
        setSaveState("idle");
        setSaveMessage(parsed ? "Video ready" : "No video configured");
    }, [productState.youtubeLink]);

    const updateDraft = (value: string) => {
        setDraft(value);
        setSaveState("dirty");
        setSaveMessage(value.trim() ? "Unsaved YouTube link" : "Removal staged. Save changes to publish it.");
        if (!value.trim()) {
            setCheckedParsed(null);
            setMetadata(null);
            setMetadataStatus("idle");
        }
    };

    const checkVideo = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!draftParsed || saveState === "checking") {
            setSaveState("failed");
            setSaveMessage("Enter a valid YouTube, youtu.be or YouTube Shorts URL.");
            return;
        }

        setSaveState("checking");
        setMetadataStatus("checking");
        setSaveMessage("Checking video details");
        try {
            const nextMetadata = await fetchYouTubeMetadata(draftParsed);
            setCheckedParsed(draftParsed);
            setMetadata(nextMetadata);
            setMetadataStatus(nextMetadata.source === "fallback" ? "unavailable" : "found");
            setSaveState("dirty");
            setSaveMessage(nextMetadata.source === "fallback" ? "Valid YouTube link. Metadata fallback used." : "Video details found");
            liveRegionRef.current?.focus();
        } catch {
            setMetadataStatus("unavailable");
            setSaveState("failed");
            setSaveMessage("This video is unavailable. It may be private, age-restricted, region-restricted or removed.");
        }
    };

    const saveChanges = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!productId || !canSave) return;

        const nextYoutubeLink = hasRemovalChange ? "" : checkedParsed?.canonicalUrl || "";
        setSaveState("saving");
        setSaveMessage(nextYoutubeLink ? "Saving featured video" : "Removing featured video");
        try {
            await updateDoc(doc(db, "products", productId), {youtubeLink: nextYoutubeLink});
            setProductState((prev: Product) => ({...prev, youtubeLink: nextYoutubeLink}));
            setSaveState("saved");
            setSaveMessage(nextYoutubeLink ? "Featured video saved" : "Featured video removed");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your draft is still here.");
        }
    };

    const stageRemoval = () => {
        setRemoveOpen(false);
        setDraft("");
        setCheckedParsed(null);
        setMetadata(null);
        setMetadataStatus("idle");
        setSaveState("dirty");
        setSaveMessage("Removal staged. Save changes to publish it.");
    };

    const replaceLink = () => {
        setDraft("");
        setCheckedParsed(null);
        setMetadata(null);
        setMetadataStatus("idle");
        setSaveState("dirty");
        setSaveMessage("Paste a replacement YouTube link.");
    };

    const previewUrl = productId ? `/show-product?product_id=${encodeURIComponent(productId)}` : undefined;

    return (
        <PageShell bleed className="upload-video-editor-shell" sx={{py: 0}}>
            <Box className="upload-video-editor-layout">
                <aside className="upload-video-editor-sidebar" aria-label="Upload Video editor navigation">
                    <FlexPayzLogo className="business-editor-logo"/>
                    <div className="upload-video-editor-icon" aria-hidden="true"><PlayArrowRoundedIcon/></div>
                    <p className="workspace-sidebar-kicker">{productState.name || "FlexPayz product"}</p>
                    <h2>Upload Video</h2>
                    <nav>
                        <a href={`/manage-device?product_id=${productId}`}>Overview</a>
                        <a href={`/manage-device?product_id=${productId}&tab=content`}>Content</a>
                        <a className="is-active" href="#upload-video-editor">Upload Video <ArrowForwardRoundedIcon fontSize="small"/></a>
                        <a href={`/manage-device?product_id=${productId}&tab=settings`}>Settings</a>
                    </nav>
                    <div className="upload-video-status-card">
                        <strong>{checkedParsed ? "READY" : "NOT READY"}</strong>
                        <span>{checkedParsed ? "YouTube embed" : "Paste one YouTube link"}</span>
                    </div>
                    <div className="business-autosave-card" aria-live="polite">
                        <strong>{saveState === "failed" ? "Needs attention" : "Autosave on"}</strong>
                        <span>{saveMessage}</span>
                    </div>
                </aside>

                <main id="upload-video-editor" className="upload-video-editor-main">
                    <header className="business-editor-header">
                        <BackButton aria-label="Back to device workspace" onClick={() => navigate(`/manage-device?product_id=${productId}`)}/>
                        <div>
                            <p className="business-kicker">UPLOAD VIDEO SETTINGS</p>
                            <h1><span className="desktop-heading">Publish with confidence</span><span className="mobile-heading">Feature one video beautifully</span></h1>
                            <p>Paste one YouTube URL, confirm the right video, then publish.</p>
                        </div>
                        <div className={`business-save-pill ${saveState}`} aria-live="polite">
                            {saveState === "checking" || saveState === "saving" ? <CircularProgress size={16} color="inherit"/> : checkedParsed ? <CheckRoundedIcon fontSize="small"/> : null}
                            <span>{checkedParsed ? "Video ready" : "Ready to check"}</span>
                        </div>
                    </header>

                    <form className="upload-video-form" onSubmit={saveChanges}>
                        <section className="upload-video-section">
                            <p className="business-kicker">01 · YOUTUBE LINK</p>
                            <label htmlFor="upload-video-youtube-link">Paste a video URL</label>
                            <div className="upload-video-input-row">
                                <TextField
                                    id="upload-video-youtube-link"
                                    label="YouTube link"
                                    value={draft}
                                    onChange={(event) => updateDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && canCheck) {
                                            event.preventDefault();
                                            checkVideo();
                                        }
                                    }}
                                    error={Boolean(inputError)}
                                    helperText={inputError || "Supports youtube.com, youtu.be and YouTube Shorts links."}
                                    fullWidth
                                    size="small"
                                    inputMode="url"
                                    autoComplete="url"
                                    InputProps={{startAdornment: <YouTubeIcon className="upload-video-youtube-icon" fontSize="small"/>}}
                                />
                                <AppButton type="button" variant="contained" onClick={() => checkVideo()} disabled={!canCheck} endIcon={saveState === "checking" ? <CircularProgress size={18} color="inherit"/> : <ArrowForwardRoundedIcon/>}>
                                    Check video
                                </AppButton>
                            </div>
                        </section>

                        <p className="upload-video-live" role="status" tabIndex={-1} ref={liveRegionRef}>{saveMessage}</p>

                        <section className="upload-video-section upload-video-confirm-section">
                            <p className="business-kicker">02 · CONFIRM BEFORE PUBLISHING</p>
                            {hasStagedRemoval ? (
                                <VideoUnavailableCard title="Removal staged" message="The current public video remains available until you save changes."/>
                            ) : checkedParsed && metadata ? (
                                <VideoConfirmationCard
                                    parsed={checkedParsed}
                                    metadata={metadata}
                                    metadataStatus={metadataStatus}
                                    onReplace={replaceLink}
                                    onRemove={() => setRemoveOpen(true)}
                                />
                            ) : savedParsed ? (
                                <VideoConfirmationCard
                                    parsed={savedParsed}
                                    metadata={getFallbackYouTubeMetadata(savedParsed)}
                                    metadataStatus="found"
                                    onReplace={replaceLink}
                                    onRemove={() => setRemoveOpen(true)}
                                />
                            ) : (
                                <VideoUnavailableCard title="No featured video yet" message="Paste a YouTube link and check it before publishing."/>
                            )}
                        </section>

                        <section className="upload-files-publishing upload-video-playback-card">
                            <div>
                                <p className="business-kicker">PUBLIC PLAYBACK</p>
                                <strong>Visitors see the poster first and decide when playback begins.</strong>
                            </div>
                            <span>USER INITIATED</span>
                            <span>YOUTUBE VIDEO</span>
                        </section>

                        <div className="business-save-bar" aria-live="polite">
                            <span>{checkedParsed ? "The selected video is ready to publish" : "No video selected"} <small>{saveMessage}</small></span>
                            <a className="upload-video-preview-link" href={previewUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!previewUrl}>
                                Preview show page
                            </a>
                            <AppButton type="submit" variant="contained" disabled={!canSave} endIcon={saveState === "saving" ? <CircularProgress size={18} color="inherit"/> : <ArrowForwardRoundedIcon/>}>
                                Save changes
                            </AppButton>
                        </div>
                    </form>
                </main>
            </Box>

            <RemoveVideoDialog
                open={removeOpen}
                removing={saveState === "saving"}
                onClose={() => setRemoveOpen(false)}
                onConfirm={stageRemoval}
            />
        </PageShell>
    );
}

function VideoConfirmationCard({
    parsed,
    metadata,
    metadataStatus,
    onReplace,
    onRemove,
}: {
    parsed: ParsedYouTubeUrl;
    metadata: YouTubeVideoMetadata;
    metadataStatus: YouTubeMetadataStatus;
    onReplace(): void;
    onRemove(): void;
}) {
    const [playing, setPlaying] = useState(false);

    return (
        <div className="upload-video-confirm-card">
            <VideoPoster parsed={parsed} metadata={metadata} playing={playing} onPlay={() => setPlaying(true)}/>
            <div className="upload-video-confirm-copy">
                <span className={`upload-video-status-pill ${metadataStatus}`}>{metadataStatus === "unavailable" ? "VALID LINK" : "READY"}</span>
                <h2>{metadata.title}</h2>
                <strong>{metadata.authorName}</strong>
                <p>YouTube video</p>
                <hr/>
                <div className="upload-video-check-row">
                    <CheckRoundedIcon fontSize="small"/>
                    <div>
                        <strong>{metadataStatus === "unavailable" ? "Video details fallback" : "Embedding can be checked"}</strong>
                        <small>{metadataStatus === "unavailable" ? "Metadata could not be loaded, but the link is valid." : "The thumbnail and details are derived from YouTube."}</small>
                    </div>
                </div>
                <div className="upload-video-confirm-actions">
                    <AppButton variant="outlined" onClick={onReplace}>Replace link</AppButton>
                    <AppButton variant="outlined" onClick={onRemove} startIcon={<DeleteOutlineRoundedIcon/>}>Remove video</AppButton>
                </div>
            </div>
        </div>
    );
}

function VideoPoster({
    parsed,
    metadata,
    playing,
    onPlay,
}: {
    parsed: ParsedYouTubeUrl;
    metadata: YouTubeVideoMetadata;
    playing: boolean;
    onPlay(): void;
}) {
    const [thumbnailIndex, setThumbnailIndex] = useState(0);
    const thumbnail = thumbnailIndex === 0 ? metadata.thumbnailUrl : parsed.thumbnailUrls[Math.min(thumbnailIndex - 1, parsed.thumbnailUrls.length - 1)];

    return (
        <div className="upload-video-poster">
            {playing ? (
                <YouTube
                    videoId={parsed.videoId}
                    title={`Preview ${metadata.title}`}
                    opts={{playerVars: {autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1}}}
                    className="upload-video-iframe"
                    iframeClassName="upload-video-iframe"
                />
            ) : (
                <>
                    <img src={thumbnail} alt={`Poster for ${metadata.title}`} onError={() => setThumbnailIndex((index) => Math.min(index + 1, parsed.thumbnailUrls.length))}/>
                    <span aria-hidden="true"/>
                    <button type="button" onClick={onPlay} aria-label={`Play ${metadata.title}`}>
                        <PlayArrowRoundedIcon/>
                    </button>
                    <strong>{metadata.title}</strong>
                </>
            )}
        </div>
    );
}

function VideoUnavailableCard({title, message}: {title: string; message: string}) {
    return (
        <div className="upload-video-unavailable-card">
            <WarningAmberRoundedIcon/>
            <div>
                <h2>{title}</h2>
                <p>{message}</p>
            </div>
        </div>
    );
}

function RemoveVideoDialog({
    open,
    removing,
    onClose,
    onConfirm,
}: {
    open: boolean;
    removing: boolean;
    onClose(): void;
    onConfirm(): void;
}) {
    return (
        <Dialog open={open} onClose={removing ? undefined : onClose} className="upload-video-remove-dialog">
            <DialogTitle>Remove the featured video?</DialogTitle>
            <DialogContent>
                <p>The Upload Video page will have no public content after you save changes.</p>
            </DialogContent>
            <DialogActions>
                <AppButton variant="outlined" onClick={onClose} disabled={removing}>Cancel</AppButton>
                <AppButton variant="contained" color="error" onClick={onConfirm} disabled={removing}>Remove video</AppButton>
            </DialogActions>
        </Dialog>
    );
}

function UploadVideoEditorState({state}: {state: PageStatus}) {
    return (
        <PageShell bleed className="upload-video-editor-shell">
            <div className="business-editor-state" role={state === "loading" ? undefined : "alert"}>
                {state === "loading" ? (
                    <LoadingPanel text="Loading video editor"/>
                ) : (
                    <>
                        <FlexPayzLogo/>
                        <h1>{state === "not-found" ? "Device not found" : "Upload Video unavailable"}</h1>
                        <p>Return to My Devices and try again.</p>
                    </>
                )}
            </div>
        </PageShell>
    );
}
