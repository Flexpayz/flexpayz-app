import {FormEvent, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {deleteObject, getMetadata, ref} from "firebase/storage";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {useNavigate} from "react-router";
import {db, storage} from "../App";
import {Product, defaultProduct} from "../control-state";
import {ManageProductContext} from "../contexts";
import {FileUploadField, UploadedFileState} from "./file-upload-field";
import {AppButton, FlexPayzLogo, PageShell} from "./design-system";
import {useResumableFileUpload} from "../useResumableFileUpload";
import {
    PDF_ACCEPT,
    PDF_MAX_SIZE_BYTES,
    UPLOAD_FILE_SLOTS,
    UploadFileFieldName,
    UploadFileMetadataState,
    UploadFileSlotDefinition,
    UploadFileSlotId,
    buildUploadFileNameUpdate,
    formatFileSize,
    getReadyUploadFileDocuments,
    getUploadFileStoragePath,
    validateDisplayName,
    validatePdfFile,
} from "../upload-files";
import {getProductIdFromURL} from "../utils";
import "../Pages/manager.css";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "failed";
type PageStatus = "loading" | "ready" | "not-found" | "error";
type MetadataBySlot = Record<UploadFileSlotId, UploadFileMetadataState>;
type DraftNames = Record<UploadFileFieldName, string>;

const emptyMetadata: MetadataBySlot = {
    file1: {exists: false},
    file2: {exists: false},
    file3: {exists: false},
};

const AUTOSAVE_DELAY = 1200;

export function UploadFileSettingsWrapper() {
    const productId = getProductIdFromURL();
    const [productState, setProductState] = useState<Product>(defaultProduct);
    const [metadataBySlot, setMetadataBySlot] = useState<MetadataBySlot>(emptyMetadata);
    const [status, setStatus] = useState<PageStatus>("loading");

    useEffect(() => {
        let active = true;

        async function loadProductAndFiles() {
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

        loadProductAndFiles();
        return () => {
            active = false;
        };
    }, [productId]);

    return (
        <ManageProductContext.Provider value={{productState, setProductState, invalidFields: new Map()}}>
            {status === "ready" ? (
                <UploadFileSettings metadataBySlot={metadataBySlot} setMetadataBySlot={setMetadataBySlot}/>
            ) : (
                <UploadFileEditorState state={status}/>
            )}
        </ManageProductContext.Provider>
    );
}

export function UploadFileSettings({
    metadataBySlot,
    setMetadataBySlot,
}: {
    metadataBySlot: MetadataBySlot;
    setMetadataBySlot: (value: MetadataBySlot | ((previous: MetadataBySlot) => MetadataBySlot)) => void;
}) {
    const navigate = useNavigate();
    const productId = getProductIdFromURL();
    const {productState, setProductState} = useContext(ManageProductContext);
    const [draftNames, setDraftNames] = useState<DraftNames>(() => getDraftNames(productState));
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveMessage, setSaveMessage] = useState("Autosave on");
    const [removeSlot, setRemoveSlot] = useState<UploadFileSlotDefinition | null>(null);
    const [removeState, setRemoveState] = useState<"idle" | "removing" | "failed">("idle");
    const [removeError, setRemoveError] = useState("");
    const autosaveTimer = useRef<number | undefined>();

    const readyDocuments = useMemo(() => getReadyUploadFileDocuments(productState, productId || "", metadataBySlot), [metadataBySlot, productId, productState]);
    const readyCount = readyDocuments.length;
    const hasInvalidReadyName = UPLOAD_FILE_SLOTS.some((slot) => metadataBySlot[slot.id].exists && Boolean(validateDisplayName(draftNames[slot.field])));
    const canSave = saveState !== "saving" && !hasInvalidReadyName;

    const setDraftName = (field: UploadFileFieldName, value: string) => {
        setDraftNames((prev) => ({...prev, [field]: value}));
        setSaveState("dirty");
        setSaveMessage("Unsaved display names");
    };

    const saveNameChanges = useCallback(async (event?: FormEvent) => {
        event?.preventDefault();
        window.clearTimeout(autosaveTimer.current);
        if (!productId || !canSave) {
            setSaveState("failed");
            setSaveMessage("Fix display names before saving.");
            return;
        }

        const payload = buildUploadFileNameUpdate(draftNames, productState);
        if (Object.keys(payload).length === 0) {
            setSaveState("saved");
            setSaveMessage("No document name changes");
            return;
        }

        setSaveState("saving");
        setSaveMessage("Saving document names");
        try {
            await updateDoc(doc(db, "products", productId), payload);
            setProductState((prev: Product) => ({...prev, ...payload}));
            setSaveState("saved");
            setSaveMessage("Document names saved");
        } catch {
            setSaveState("failed");
            setSaveMessage("Save failed. Your draft is still here.");
        }
    }, [canSave, draftNames, productId, productState, setProductState]);

    useEffect(() => {
        setDraftNames(getDraftNames(productState));
    }, [productState]);

    useEffect(() => {
        if (saveState !== "dirty" || !canSave || !productId) return;
        window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(() => {
            saveNameChanges();
        }, AUTOSAVE_DELAY);
        return () => window.clearTimeout(autosaveTimer.current);
    }, [saveState, canSave, productId, saveNameChanges]);

    const saveSingleName = async (slot: UploadFileSlotDefinition, value: string) => {
        if (!productId) return;
        const trimmed = value.trim();
        const error = validateDisplayName(trimmed);
        if (error) {
            setSaveState("failed");
            setSaveMessage(error);
            return;
        }

        await updateDoc(doc(db, "products", productId), {[slot.field]: trimmed});
        setProductState((prev: Product) => ({...prev, [slot.field]: trimmed}));
        setDraftNames((prev) => ({...prev, [slot.field]: trimmed}));
        setSaveState("saved");
        setSaveMessage("Document uploaded and named");
    };

    const refreshSlotMetadata = async (slot: UploadFileSlotDefinition) => {
        if (!productId) return;
        const metadata = await getSlotMetadata(productId, slot);
        setMetadataBySlot((prev) => ({...prev, [slot.id]: metadata}));
    };

    const confirmRemove = async () => {
        if (!productId || !removeSlot || removeState === "removing") return;
        setRemoveState("removing");
        setRemoveError("");
        const storageRef = ref(storage, getUploadFileStoragePath(productId, removeSlot));

        try {
            await deleteObject(storageRef).catch((error) => {
                if (error?.code !== "storage/object-not-found") throw error;
            });
            await updateDoc(doc(db, "products", productId), {[removeSlot.field]: ""});
            setProductState((prev: Product) => ({...prev, [removeSlot.field]: ""}));
            setDraftNames((prev) => ({...prev, [removeSlot.field]: ""}));
            setMetadataBySlot((prev) => ({...prev, [removeSlot.id]: {exists: false}}));
            setRemoveSlot(null);
            setRemoveState("idle");
            setSaveMessage("Document removed");
            setSaveState("saved");
        } catch {
            await refreshSlotMetadata(removeSlot);
            setRemoveState("failed");
            setRemoveError("Removal did not complete. The current slot state was refreshed; try again.");
        }
    };

    return (
        <PageShell bleed className="upload-files-editor-shell" sx={{py: 0}}>
            <Box className="upload-files-editor-layout">
                <aside className="upload-files-editor-sidebar" aria-label="Upload Files editor navigation">
                    <FlexPayzLogo className="business-editor-logo"/>
                    <div className="upload-files-editor-icon" aria-hidden="true">PDF</div>
                    <p className="workspace-sidebar-kicker">{productState.name || "FlexPayz product"}</p>
                    <h2>Upload Files</h2>
                    <nav>
                        <a href={`/manage-device?product_id=${productId}`}>Overview</a>
                        <a href={`/manage-device?product_id=${productId}&tab=content`}>Content</a>
                        <a className="is-active" href="#upload-files-editor">Upload Files <ArrowForwardRoundedIcon fontSize="small"/></a>
                        <a href={`/manage-device?product_id=${productId}&tab=settings`}>Settings</a>
                    </nav>
                    <div className="upload-files-count-card">
                        <strong>{readyCount} / 3</strong>
                        <span>{readyCount === 1 ? "One file ready" : `${readyCount} files ready`}</span>
                    </div>
                    <div className="business-autosave-card" aria-live="polite">
                        <strong>{saveState === "failed" ? "Needs attention" : "Autosave on"}</strong>
                        <span>{saveMessage}</span>
                    </div>
                </aside>

                <main id="upload-files-editor" className="upload-files-editor-main">
                    <header className="business-editor-header">
                        <button className="business-icon-button" type="button" aria-label="Back to device workspace" onClick={() => navigate(`/manage-device?product_id=${productId}`)}>
                            <ArrowBackRoundedIcon/>
                        </button>
                        <div>
                            <p className="business-kicker">UPLOAD FILES SETTINGS</p>
                            <h1><span className="desktop-heading">Manage shared documents</span><span className="mobile-heading">Share useful documents</span></h1>
                            <p>Upload, rename, replace or remove up to three PDF documents.</p>
                        </div>
                        <div className={`business-save-pill ${saveState}`} aria-live="polite">
                            {saveState === "saving" ? <CircularProgress size={16} color="inherit"/> : saveState === "saved" ? <CheckRoundedIcon fontSize="small"/> : null}
                            <span>{readyCount} of 3 ready</span>
                        </div>
                    </header>

                    <form className="upload-files-form" onSubmit={saveNameChanges}>
                        <section className="upload-files-section">
                            <p className="business-kicker">DOCUMENT SLOTS</p>
                            <p>Each slot becomes one public download card.</p>
                            <div className="upload-files-slot-list">
                                {UPLOAD_FILE_SLOTS.map((slot) => (
                                    <UploadFileSlotCard
                                        key={slot.id}
                                        slot={slot}
                                        productId={productId || ""}
                                        displayName={draftNames[slot.field]}
                                        savedDisplayName={productState[slot.field]}
                                        metadataState={metadataBySlot[slot.id]}
                                        onDisplayNameChange={(value) => setDraftName(slot.field, value)}
                                        onMetadataChange={(metadata) => setMetadataBySlot((prev) => ({...prev, [slot.id]: metadata}))}
                                        onUploadNamed={saveSingleName}
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
                                <p className="business-kicker">PUBLIC PAGE</p>
                                <strong>Only uploaded files with a display name are shown.</strong>
                            </div>
                            <span>PDF ONLY</span>
                            <span>FIXED ORDER</span>
                        </section>

                        <div className="business-save-bar" aria-live="polite">
                            <span>{readyCount === 1 ? "One document is ready to publish" : `${readyCount} documents are ready to publish`} <small>{saveMessage}</small></span>
                            <AppButton type="submit" variant="contained" disabled={!canSave} endIcon={saveState === "saving" ? <CircularProgress size={18} color="inherit"/> : <ArrowForwardRoundedIcon/>}>
                                Save changes
                            </AppButton>
                        </div>
                    </form>
                </main>
            </Box>

            <RemoveFileDialog
                slot={removeSlot}
                displayName={removeSlot ? draftNames[removeSlot.field] || removeSlot.label : ""}
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

function UploadFileSlotCard({
    slot,
    productId,
    displayName,
    savedDisplayName,
    metadataState,
    onDisplayNameChange,
    onMetadataChange,
    onUploadNamed,
    onRemove,
}: {
    slot: UploadFileSlotDefinition;
    productId: string;
    displayName: string;
    savedDisplayName: string;
    metadataState: UploadFileMetadataState;
    onDisplayNameChange(value: string): void;
    onMetadataChange(metadata: UploadFileMetadataState): void;
    onUploadNamed(slot: UploadFileSlotDefinition, value: string): Promise<void>;
    onRemove(): void;
}) {
    const storagePath = productId ? getUploadFileStoragePath(productId, slot) : "";
    const {state, upload, cancel, retry, reset} = useResumableFileUpload({storagePath, validateFile: validatePdfFile});
    const hasStorageFile = metadataState.exists;
    const hasSavedName = Boolean(savedDisplayName?.trim());
    const nameError = hasStorageFile ? validateDisplayName(displayName) : null;
    const fileState: UploadedFileState = {
        displayName: savedDisplayName,
        originalName: metadataState.metadata?.customMetadata?.originalName || metadataState.metadata?.name || savedDisplayName || slot.label,
        sizeLabel: metadataState.metadata?.size ? formatFileSize(metadataState.metadata.size) : "PDF",
        typeLabel: "PDF",
        status: hasStorageFile ? "ready" : hasSavedName ? "missing" : "empty",
        errorMessage: metadataState.error === "missing" && hasSavedName ? "File unavailable. Replace or remove this slot." : undefined,
    };

    const startUpload = async (file: File) => {
        if (!productId) return;
        const metadata = await upload(file, {
            contentType: "application/pdf",
            customMetadata: {originalName: file.name},
        });
        if (!metadata) return;
        onMetadataChange({exists: true, metadata});
        const nextDisplayName = displayName.trim() || file.name;
        onDisplayNameChange(nextDisplayName);
        if (!displayName.trim()) {
            await onUploadNamed(slot, nextDisplayName);
        }
    };

    return (
        <article className={`upload-files-slot-card ${metadataState.error === "missing" && hasSavedName ? "is-missing" : ""}`}>
            <div className="upload-files-slot-header">
                <span className="upload-files-pdf-icon" aria-hidden="true"><DescriptionRoundedIcon fontSize="small"/></span>
                <div>
                    <p className="business-kicker">{slot.label} · {hasStorageFile ? "READY" : state.status === "uploading" ? "UPLOADING" : hasSavedName ? "UNAVAILABLE" : "EMPTY"}</p>
                    <strong>{fileState.originalName}</strong>
                    <small>PDF · {fileState.sizeLabel}</small>
                </div>
                {hasStorageFile && <em>READY</em>}
            </div>

            {hasStorageFile && (
                <TextField
                    label="Display name"
                    value={displayName}
                    onChange={(event) => onDisplayNameChange(event.target.value)}
                    error={Boolean(nameError)}
                    helperText={nameError || "This name appears on the public page."}
                    fullWidth
                    size="small"
                    inputProps={{maxLength: 80}}
                />
            )}

            <FileUploadField
                id={`upload-${slot.id}`}
                label={`${slot.label} PDF upload`}
                accept={PDF_ACCEPT}
                maxSizeBytes={PDF_MAX_SIZE_BYTES}
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
                        const nextDisplayName = displayName.trim() || state.fileName || metadata.customMetadata?.originalName || slot.label;
                        onDisplayNameChange(nextDisplayName);
                        if (!displayName.trim()) {
                            await onUploadNamed(slot, nextDisplayName);
                        }
                        reset();
                    }
                }}
                onRemove={hasSavedName || hasStorageFile ? onRemove : undefined}
                helperText={`Accepted format: PDF document · Maximum ${formatFileSize(PDF_MAX_SIZE_BYTES)}`}
            />
        </article>
    );
}

function RemoveFileDialog({
    slot,
    displayName,
    state,
    error,
    onClose,
    onConfirm,
}: {
    slot: UploadFileSlotDefinition | null;
    displayName: string;
    state: "idle" | "removing" | "failed";
    error: string;
    onClose(): void;
    onConfirm(): void;
}) {
    return (
        <Dialog open={Boolean(slot)} onClose={onClose} className="upload-files-remove-dialog">
            <DialogTitle>Remove “{displayName.trim() || slot?.label}”?</DialogTitle>
            <DialogContent>
                <p>This removes the document from the public page. The empty slot can be used again.</p>
                {error && <div className="upload-files-remove-error" role="alert"><WarningAmberRoundedIcon fontSize="small"/>{error}</div>}
            </DialogContent>
            <DialogActions>
                <AppButton variant="outlined" onClick={onClose} disabled={state === "removing"}>Cancel</AppButton>
                <AppButton variant="contained" color="error" onClick={onConfirm} disabled={state === "removing"}>
                    {state === "removing" ? <CircularProgress size={18} color="inherit"/> : "Remove file"}
                </AppButton>
            </DialogActions>
        </Dialog>
    );
}

function UploadFileEditorState({state}: {state: PageStatus}) {
    return (
        <PageShell bleed className="upload-files-editor-shell">
            <div className="business-editor-state" role={state === "loading" ? "status" : "alert"}>
                <FlexPayzLogo/>
                {state === "loading" ? <CircularProgress size={28}/> : null}
                <h1>{state === "loading" ? "Loading Upload Files" : state === "not-found" ? "Device not found" : "Upload Files unavailable"}</h1>
                <p>{state === "loading" ? "Preparing your document slots." : "Return to My Devices and try again."}</p>
            </div>
        </PageShell>
    );
}

function getDraftNames(product: Product): DraftNames {
    return {
        filename1: product.filename1 || "",
        filename2: product.filename2 || "",
        filename3: product.filename3 || "",
    };
}

async function loadSlotMetadata(productId: string): Promise<MetadataBySlot> {
    const entries = await Promise.all(
        UPLOAD_FILE_SLOTS.map(async (slot) => [slot.id, await getSlotMetadata(productId, slot)] as const),
    );
    return entries.reduce<MetadataBySlot>((metadata, [slotId, slotMetadata]) => ({...metadata, [slotId]: slotMetadata}), emptyMetadata);
}

async function getSlotMetadata(productId: string, slot: UploadFileSlotDefinition): Promise<UploadFileMetadataState> {
    try {
        const metadata = await getMetadata(ref(storage, getUploadFileStoragePath(productId, slot)));
        return {exists: true, metadata};
    } catch (error: any) {
        return {exists: false, error: error?.code === "storage/object-not-found" ? "missing" : "unavailable"};
    }
}
