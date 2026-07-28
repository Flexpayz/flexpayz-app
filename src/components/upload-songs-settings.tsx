import {CSSProperties, FormEvent, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {deleteObject, getMetadata, ref} from "firebase/storage";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {useNavigate} from "react-router";
import {db, storage} from "../App";
import {Product, defaultProduct} from "../control-state";
import {ManageProductContext} from "../contexts";
import {AppButton, FlexPayzLogo, PageShell} from "./design-system";
import {FileUploadField, UploadedFileState} from "./file-upload-field";
import {useResumableFileUpload} from "../useResumableFileUpload";
import {formatFileSize} from "../upload-files";
import {
    AUDIO_ACCEPT,
    AUDIO_MAX_SIZE_BYTES,
    UPLOAD_SONG_SLOTS,
    UploadSongFieldName,
    UploadSongMetadataState,
    UploadSongSlotDefinition,
    UploadSongSlotId,
    buildUploadSongTitleUpdate,
    getAudioTypeLabel,
    getContentTypeFromName,
    getReadyUploadSongTracks,
    getUploadSongStoragePath,
    validateAudioFile,
    validateSongTitle,
} from "../upload-songs";
import {getProductIdFromURL} from "../utils";
import "../Pages/manager.css";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "failed";
type PageStatus = "loading" | "ready" | "not-found" | "error";
type MetadataBySlot = Record<UploadSongSlotId, UploadSongMetadataState>;
type DraftTitles = Record<UploadSongFieldName, string>;

const emptyMetadata: MetadataBySlot = {
    song1: {exists: false},
    song2: {exists: false},
    song3: {exists: false},
};

const AUTOSAVE_DELAY = 1200;

export function UploadSongsSettingsWrapper() {
    const productId = getProductIdFromURL();
    const [productState, setProductState] = useState<Product>(defaultProduct);
    const [metadataBySlot, setMetadataBySlot] = useState<MetadataBySlot>(emptyMetadata);
    const [status, setStatus] = useState<PageStatus>("loading");

    useEffect(() => {
        let active = true;

        async function loadProductAndSongs() {
            if (!productId) {
                setStatus("not-found");
                return;
            }

            try {
                const productSnapshot = await getDoc(doc(db, "products", productId));
                if (!active) return;
                if (!productSnapshot.exists()) {
                    setStatus("not-found");
                    return;
                }

                const product = {...defaultProduct, ...productSnapshot.data() as Product};
                const metadata = await loadSlotMetadata(productId);
                if (!active) return;
                setProductState(product);
                setMetadataBySlot(metadata);
                setStatus("ready");
            } catch {
                if (active) setStatus("error");
            }
        }

        loadProductAndSongs();
        return () => {
            active = false;
        };
    }, [productId]);

    return (
        <ManageProductContext.Provider value={{productState, setProductState, invalidFields: new Map()}}>
            {status === "ready" ? (
                <UploadSongsSettings metadataBySlot={metadataBySlot} setMetadataBySlot={setMetadataBySlot}/>
            ) : (
                <UploadSongsEditorState state={status}/>
            )}
        </ManageProductContext.Provider>
    );
}

export function UploadSongsSettings({
    metadataBySlot,
    setMetadataBySlot,
}: {
    metadataBySlot: MetadataBySlot;
    setMetadataBySlot: (value: MetadataBySlot | ((previous: MetadataBySlot) => MetadataBySlot)) => void;
}) {
    const navigate = useNavigate();
    const productId = getProductIdFromURL();
    const {productState, setProductState} = useContext(ManageProductContext);
    const [draftTitles, setDraftTitles] = useState<DraftTitles>(() => getDraftTitles(productState));
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveMessage, setSaveMessage] = useState("Autosave on");
    const [removeSlot, setRemoveSlot] = useState<UploadSongSlotDefinition | null>(null);
    const [removeState, setRemoveState] = useState<"idle" | "removing" | "failed">("idle");
    const [removeError, setRemoveError] = useState("");
    const autosaveTimer = useRef<number | undefined>();

    const readyTracks = useMemo(() => getReadyUploadSongTracks(productState, productId || "", metadataBySlot), [metadataBySlot, productId, productState]);
    const readyCount = readyTracks.length;
    const hasInvalidReadyTitle = UPLOAD_SONG_SLOTS.some((slot) => metadataBySlot[slot.id].exists && Boolean(validateSongTitle(draftTitles[slot.field])));
    const canSave = saveState !== "saving" && !hasInvalidReadyTitle;

    const setDraftTitle = (field: UploadSongFieldName, value: string) => {
        setDraftTitles((prev) => ({...prev, [field]: value}));
        setSaveState("dirty");
        setSaveMessage("Unsaved track titles");
    };

    const saveTitleChanges = useCallback(async (event?: FormEvent) => {
        event?.preventDefault();
        window.clearTimeout(autosaveTimer.current);
        if (!productId || !canSave) {
            setSaveState("failed");
            setSaveMessage("Fix track titles before saving.");
            return;
        }

        const payload = buildUploadSongTitleUpdate(draftTitles, productState);
        if (Object.keys(payload).length === 0) {
            setSaveState("saved");
            setSaveMessage("No track title changes");
            return;
        }

        setSaveState("saving");
        setSaveMessage("Saving track titles");
        try {
            await updateDoc(doc(db, "products", productId), payload);
            setProductState((prev: Product) => ({...prev, ...payload}));
            setSaveState("saved");
            setSaveMessage("Track titles saved");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your draft is still here.");
        }
    }, [canSave, draftTitles, productId, productState, setProductState]);

    useEffect(() => {
        setDraftTitles(getDraftTitles(productState));
    }, [productState]);

    useEffect(() => {
        if (saveState !== "dirty" || !canSave || !productId) return;
        window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(() => {
            saveTitleChanges();
        }, AUTOSAVE_DELAY);
        return () => window.clearTimeout(autosaveTimer.current);
    }, [saveState, canSave, productId, saveTitleChanges]);

    const saveSingleTitle = async (slot: UploadSongSlotDefinition, value: string) => {
        if (!productId) return;
        const trimmed = value.trim();
        const error = validateSongTitle(trimmed);
        if (error) {
            setSaveState("failed");
            setSaveMessage(error);
            return;
        }

        await updateDoc(doc(db, "products", productId), {[slot.field]: trimmed});
        setProductState((prev: Product) => ({...prev, [slot.field]: trimmed}));
        setDraftTitles((prev) => ({...prev, [slot.field]: trimmed}));
        setSaveState("saved");
        setSaveMessage("Track uploaded and titled");
    };

    const refreshSlotMetadata = async (slot: UploadSongSlotDefinition) => {
        if (!productId) return;
        const metadata = await getSlotMetadata(productId, slot);
        setMetadataBySlot((prev) => ({...prev, [slot.id]: metadata}));
    };

    const confirmRemove = async () => {
        if (!productId || !removeSlot || removeState === "removing") return;
        setRemoveState("removing");
        setRemoveError("");
        const storageRef = ref(storage, getUploadSongStoragePath(productId, removeSlot));

        try {
            await deleteObject(storageRef).catch((error) => {
                if (error?.code !== "storage/object-not-found") throw error;
            });
            await updateDoc(doc(db, "products", productId), {[removeSlot.field]: ""});
            setProductState((prev: Product) => ({...prev, [removeSlot.field]: ""}));
            setDraftTitles((prev) => ({...prev, [removeSlot.field]: ""}));
            setMetadataBySlot((prev) => ({...prev, [removeSlot.id]: {exists: false}}));
            setRemoveSlot(null);
            setRemoveState("idle");
            setSaveMessage("Track removed");
            setSaveState("saved");
        } catch {
            await refreshSlotMetadata(removeSlot);
            setRemoveState("failed");
            setRemoveError("Removal did not complete. The current slot state was refreshed; try again.");
        }
    };

    return (
        <PageShell bleed className="upload-files-editor-shell upload-songs-editor-shell" sx={{py: 0}}>
            <Box className="upload-files-editor-layout upload-songs-editor-layout">
                <aside className="upload-files-editor-sidebar" aria-label="Upload Songs editor navigation">
                    <FlexPayzLogo className="business-editor-logo"/>
                    <div className="upload-files-editor-icon upload-songs-editor-icon" aria-hidden="true"><MusicNoteRoundedIcon/></div>
                    <p className="workspace-sidebar-kicker">{productState.name || "FlexPayz product"}</p>
                    <h2>Upload Songs</h2>
                    <nav>
                        <a href={`/manage-device?product_id=${productId}`}>Overview</a>
                        <a href={`/manage-device?product_id=${productId}&tab=content`}>Content</a>
                        <a className="is-active" href="#upload-songs-editor">Upload Songs <ArrowForwardRoundedIcon fontSize="small"/></a>
                        <a href={`/manage-device?product_id=${productId}&tab=settings`}>Settings</a>
                    </nav>
                    <div className="upload-files-count-card">
                        <strong>{readyCount} / 3</strong>
                        <span>{readyCount === 1 ? "One track ready" : `${readyCount} tracks ready`}</span>
                    </div>
                    <div className="business-autosave-card" aria-live="polite">
                        <strong>{saveState === "failed" ? "Needs attention" : "Autosave on"}</strong>
                        <span>{saveMessage}</span>
                    </div>
                </aside>

                <main id="upload-songs-editor" className="upload-files-editor-main">
                    <header className="business-editor-header">
                        <button className="business-icon-button" type="button" aria-label="Back to device workspace" onClick={() => navigate(`/manage-device?product_id=${productId}`)}>
                            <ArrowBackRoundedIcon/>
                        </button>
                        <div>
                            <p className="business-kicker">UPLOAD SONGS SETTINGS</p>
                            <h1><span className="desktop-heading">Curate the audio experience</span><span className="mobile-heading">Build your audio collection</span></h1>
                            <p>Upload, title, test, replace or remove up to three audio tracks.</p>
                        </div>
                        <div className={`business-save-pill ${saveState}`} aria-live="polite">
                            {saveState === "saving" ? <CircularProgress size={16} color="inherit"/> : saveState === "saved" ? <CheckRoundedIcon fontSize="small"/> : null}
                            <span>{readyCount} of 3 ready</span>
                        </div>
                    </header>

                    <form className="upload-files-form upload-songs-form" onSubmit={saveTitleChanges}>
                        <section className="upload-files-section">
                            <p className="business-kicker">AUDIO SLOTS</p>
                            <p>Each slot becomes one track in the public player.</p>
                            <div className="upload-files-slot-list">
                                {UPLOAD_SONG_SLOTS.map((slot) => (
                                    <UploadSongSlotCard
                                        key={slot.id}
                                        slot={slot}
                                        productId={productId || ""}
                                        title={draftTitles[slot.field]}
                                        savedTitle={productState[slot.field]}
                                        metadataState={metadataBySlot[slot.id]}
                                        onTitleChange={(value) => setDraftTitle(slot.field, value)}
                                        onMetadataChange={(metadata) => setMetadataBySlot((prev) => ({...prev, [slot.id]: metadata}))}
                                        onUploadNamed={saveSingleTitle}
                                        onRemove={() => {
                                            setRemoveSlot(slot);
                                            setRemoveState("idle");
                                            setRemoveError("");
                                        }}
                                    />
                                ))}
                            </div>
                        </section>

                        <section className="upload-files-publishing">
                            <div>
                                <p className="business-kicker">PUBLIC PLAYER</p>
                                <strong>Ready tracks appear in slot order; visitors start playback themselves.</strong>
                            </div>
                            <span>AUDIO ONLY</span>
                            <span>FIXED ORDER</span>
                        </section>

                        <div className="business-save-bar" aria-live="polite">
                            <span>{readyCount === 1 ? "One track is ready to publish" : `${readyCount} tracks are ready to publish`} <small>{saveMessage}</small></span>
                            <AppButton type="submit" variant="contained" disabled={!canSave} endIcon={saveState === "saving" ? <CircularProgress size={18} color="inherit"/> : <ArrowForwardRoundedIcon/>}>
                                Save changes
                            </AppButton>
                        </div>
                    </form>
                </main>
            </Box>

            <RemoveSongDialog
                slot={removeSlot}
                title={removeSlot ? draftTitles[removeSlot.field] || removeSlot.label : ""}
                state={removeState}
                error={removeError}
                onClose={() => {
                    if (removeState !== "removing") setRemoveSlot(null);
                }}
                onConfirm={confirmRemove}
            />
        </PageShell>
    );
}

function UploadSongSlotCard({
    slot,
    productId,
    title,
    savedTitle,
    metadataState,
    onTitleChange,
    onMetadataChange,
    onUploadNamed,
    onRemove,
}: {
    slot: UploadSongSlotDefinition;
    productId: string;
    title: string;
    savedTitle: string;
    metadataState: UploadSongMetadataState;
    onTitleChange(value: string): void;
    onMetadataChange(metadata: UploadSongMetadataState): void;
    onUploadNamed(slot: UploadSongSlotDefinition, value: string): Promise<void>;
    onRemove(): void;
}) {
    const storagePath = productId ? getUploadSongStoragePath(productId, slot) : "";
    const {state, upload, cancel, retry, reset} = useResumableFileUpload({storagePath, validateFile: validateAudioFile});
    const hasStorageFile = metadataState.exists;
    const hasSavedTitle = Boolean(savedTitle?.trim());
    const titleError = hasStorageFile ? validateSongTitle(title) : null;
    const originalName = metadataState.metadata?.customMetadata?.originalName || metadataState.metadata?.name || savedTitle || slot.label;
    const typeLabel = getAudioTypeLabel(originalName, metadataState.metadata?.contentType);
    const fileState: UploadedFileState = {
        displayName: savedTitle,
        originalName,
        sizeLabel: metadataState.metadata?.size ? formatFileSize(metadataState.metadata.size) : typeLabel,
        typeLabel,
        status: hasStorageFile ? "ready" : hasSavedTitle ? "missing" : "empty",
        errorMessage: metadataState.error === "missing" && hasSavedTitle ? "Track unavailable. Replace or remove this slot." : undefined,
    };

    const startUpload = async (file: File) => {
        if (!productId) return;
        const contentType = file.type || getContentTypeFromName(file.name);
        const metadata = await upload(file, {
            contentType,
            customMetadata: {originalName: file.name},
        });
        if (!metadata) return;
        onMetadataChange({exists: true, metadata});
        const nextTitle = title.trim() || file.name.replace(/\.[^/.]+$/, "");
        onTitleChange(nextTitle);
        if (!title.trim()) {
            await onUploadNamed(slot, nextTitle);
        }
    };

    return (
        <article className={`upload-files-slot-card upload-songs-slot-card ${metadataState.error === "missing" && hasSavedTitle ? "is-missing" : ""}`}>
            <div className="upload-files-slot-header upload-songs-slot-header">
                <span className="upload-files-pdf-icon upload-songs-note-icon" aria-hidden="true"><MusicNoteRoundedIcon fontSize="small"/></span>
                <div>
                    <p className="business-kicker">{slot.label} · {hasStorageFile ? "READY" : state.status === "uploading" ? "UPLOADING" : hasSavedTitle ? "UNAVAILABLE" : "EMPTY"}</p>
                    <strong>{originalName}</strong>
                    <small>{typeLabel} · {fileState.sizeLabel}</small>
                </div>
                {hasStorageFile ? <button className="upload-songs-play-preview" type="button" aria-label={`Preview ${title || slot.label}`}><PlayArrowRoundedIcon fontSize="small"/></button> : null}
            </div>

            <div className="upload-songs-waveform" aria-hidden="true">
                {Array.from({length: 24}).map((_, index) => <span key={index} style={{"--wave-height": `${28 + ((index * 13) % 34)}%`} as CSSProperties}/>)}
            </div>

            {hasStorageFile && (
                <TextField
                    label="Track title"
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    error={Boolean(titleError)}
                    helperText={titleError || "This title appears in the public player."}
                    fullWidth
                    size="small"
                    inputProps={{maxLength: 80}}
                />
            )}

            <FileUploadField
                id={`upload-${slot.id}`}
                label={`${slot.label} audio upload`}
                accept={AUDIO_ACCEPT}
                maxSizeBytes={AUDIO_MAX_SIZE_BYTES}
                emptyTitle="Drop an audio file here"
                emptyDescription="or choose one from your device"
                acceptedFormatLabel="Audio files"
                file={fileState}
                uploadState={state}
                disabled={!productId}
                onSelect={startUpload}
                onReplace={startUpload}
                onCancel={cancel}
                onRetry={async () => {
                    const metadata = await retry();
                    if (metadata) {
                        onMetadataChange({exists: true, metadata});
                        const nextTitle = title.trim() || state.fileName.replace(/\.[^/.]+$/, "") || metadata.customMetadata?.originalName || slot.label;
                        onTitleChange(nextTitle);
                        if (!title.trim()) {
                            await onUploadNamed(slot, nextTitle);
                        }
                        reset();
                    }
                }}
                onRemove={hasSavedTitle || hasStorageFile ? onRemove : undefined}
                helperText={`Accepted formats: MP3, M4A or WAV · Maximum ${formatFileSize(AUDIO_MAX_SIZE_BYTES)}`}
            />
        </article>
    );
}

function RemoveSongDialog({
    slot,
    title,
    state,
    error,
    onClose,
    onConfirm,
}: {
    slot: UploadSongSlotDefinition | null;
    title: string;
    state: "idle" | "removing" | "failed";
    error: string;
    onClose(): void;
    onConfirm(): void;
}) {
    return (
        <Dialog open={Boolean(slot)} onClose={onClose} className="upload-files-remove-dialog">
            <DialogTitle>Remove “{title.trim() || slot?.label}”?</DialogTitle>
            <DialogContent>
                <p>The track disappears from the public playlist. Its slot becomes available again.</p>
                {error && <div className="upload-files-remove-error" role="alert"><WarningAmberRoundedIcon fontSize="small"/>{error}</div>}
            </DialogContent>
            <DialogActions>
                <AppButton variant="outlined" onClick={onClose} disabled={state === "removing"}>Cancel</AppButton>
                <AppButton variant="contained" color="error" onClick={onConfirm} disabled={state === "removing"}>
                    {state === "removing" ? <CircularProgress size={18} color="inherit"/> : "Remove track"}
                </AppButton>
            </DialogActions>
        </Dialog>
    );
}

function UploadSongsEditorState({state}: {state: PageStatus}) {
    return (
        <PageShell bleed className="upload-files-editor-shell upload-songs-editor-shell">
            <div className="business-editor-state" role={state === "loading" ? "status" : "alert"}>
                <FlexPayzLogo/>
                {state === "loading" ? <CircularProgress size={28}/> : null}
                <h1>{state === "loading" ? "Loading Upload Songs" : state === "not-found" ? "Device not found" : "Upload Songs unavailable"}</h1>
                <p>{state === "loading" ? "Preparing your audio slots." : "Return to My Devices and try again."}</p>
            </div>
        </PageShell>
    );
}

function getDraftTitles(product: Product): DraftTitles {
    return {
        song1: product.song1 || "",
        song2: product.song2 || "",
        song3: product.song3 || "",
    };
}

async function loadSlotMetadata(productId: string): Promise<MetadataBySlot> {
    const entries = await Promise.all(
        UPLOAD_SONG_SLOTS.map(async (slot) => [slot.id, await getSlotMetadata(productId, slot)] as const),
    );
    return entries.reduce<MetadataBySlot>((metadata, [slotId, slotMetadata]) => ({...metadata, [slotId]: slotMetadata}), emptyMetadata);
}

async function getSlotMetadata(productId: string, slot: UploadSongSlotDefinition): Promise<UploadSongMetadataState> {
    try {
        const metadata = await getMetadata(ref(storage, getUploadSongStoragePath(productId, slot)));
        return {exists: true, metadata};
    } catch (error: any) {
        return {exists: false, error: error?.code === "storage/object-not-found" ? "missing" : "unavailable"};
    }
}
