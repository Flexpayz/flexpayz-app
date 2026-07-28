import {ChangeEvent, DragEvent, KeyboardEvent, ReactNode, useId, useRef, useState} from "react";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import {ResumableUploadState} from "../useResumableFileUpload";
import {formatFileSize} from "../upload-files";

export type UploadedFileState = {
    displayName?: string;
    originalName?: string;
    sizeLabel?: string;
    typeLabel?: string;
    status?: "empty" | "ready" | "missing" | "uploading" | "error";
    progress?: number;
    errorMessage?: string;
};

export type FileUploadFieldProps = {
    id?: string;
    label: string;
    accept: string[];
    maxSizeBytes: number;
    file?: UploadedFileState;
    disabled?: boolean;
    helperText?: ReactNode;
    uploadState?: ResumableUploadState;
    onSelect(file: File): void;
    onCancel?(): void;
    onRetry?(): void;
    onReplace?(file: File): void;
    onRemove?(): void;
};

export function FileUploadField({
    id,
    label,
    accept,
    maxSizeBytes,
    file,
    disabled = false,
    helperText,
    uploadState,
    onSelect,
    onCancel,
    onRetry,
    onReplace,
    onRemove,
}: FileUploadFieldProps) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [localError, setLocalError] = useState("");
    const isUploading = uploadState?.status === "uploading" || uploadState?.status === "paused" || uploadState?.status === "validating";
    const hasReadyFile = file?.status === "ready" || file?.status === "missing";
    const displayName = uploadState?.fileName || file?.originalName || file?.displayName || label;
    const progress = uploadState?.progress ?? file?.progress ?? 0;
    const errorMessage = localError || uploadState?.errorMessage || file?.errorMessage;

    const openPicker = () => {
        if (!disabled && !isUploading) inputRef.current?.click();
    };

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (files.length > 1) {
            setLocalError("Upload one file per slot.");
            return;
        }
        setLocalError("");
        const fileToUpload = files[0];
        if (hasReadyFile && onReplace) onReplace(fileToUpload);
        else onSelect(fileToUpload);
        if (inputRef.current) inputRef.current.value = "";
    };

    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);
        if (!disabled && !isUploading) handleFiles(event.dataTransfer.files);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
        }
    };

    return (
        <div className={`file-upload-field ${dragActive ? "is-drag-active" : ""} ${isUploading ? "is-uploading" : ""} ${errorMessage ? "has-error" : ""}`}>
            <input
                ref={inputRef}
                id={inputId}
                className="file-upload-field-input"
                type="file"
                accept={accept.join(",")}
                disabled={disabled || isUploading}
                onChange={onInputChange}
                aria-describedby={`${inputId}-status ${inputId}-help`}
            />
            <div
                className="file-upload-field-dropzone"
                role="button"
                tabIndex={disabled || isUploading ? -1 : 0}
                aria-label={hasReadyFile ? `Replace ${label}` : label}
                onClick={openPicker}
                onKeyDown={onKeyDown}
                onDragEnter={(event) => {
                    event.preventDefault();
                    if (!disabled && !isUploading) setDragActive(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
            >
                <span className="file-upload-field-icon" aria-hidden="true">
                    {hasReadyFile || isUploading ? <DescriptionRoundedIcon/> : <UploadRoundedIcon/>}
                </span>
                <div>
                    <strong>{isUploading ? displayName : hasReadyFile ? displayName : "Drop a PDF here"}</strong>
                    <small>{isUploading ? `${formatFileSize(uploadState?.fileSize || 0)} · Uploading securely…` : hasReadyFile ? `${file?.typeLabel || "PDF"} · ${file?.sizeLabel || "PDF"}` : "or choose a file from your computer"}</small>
                </div>
                {!hasReadyFile && !isUploading && <button type="button" disabled={disabled} onClick={(event) => { event.stopPropagation(); openPicker(); }}>Browse files</button>}
            </div>
            {isUploading && (
                <div className="file-upload-field-progress">
                    <span>{progress}%</span>
                    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${label} upload progress`}>
                        <i style={{transform: `scaleX(${progress / 100})`}}/>
                    </div>
                    {onCancel && <button type="button" onClick={onCancel}>Cancel upload</button>}
                </div>
            )}
            {errorMessage && !isUploading && (
                <div className="file-upload-field-error" role="alert">
                    <strong>{errorMessage}</strong>
                    <div>
                        {onRetry && <button type="button" onClick={onRetry}>Retry upload</button>}
                        <button type="button" onClick={openPicker}>Choose another</button>
                    </div>
                </div>
            )}
            {hasReadyFile && !isUploading && (
                <div className="file-upload-field-actions">
                    <button type="button" onClick={openPicker}>Replace</button>
                    {onRemove && <button type="button" onClick={onRemove}>Remove</button>}
                </div>
            )}
            <p id={`${inputId}-help`} className="file-upload-field-help">{helperText || `PDF only · maximum ${formatFileSize(maxSizeBytes)}`}</p>
            <p id={`${inputId}-status`} className="file-upload-field-status" aria-live="polite">
                {isUploading ? `${label} upload ${progress}% complete.` : errorMessage || (hasReadyFile ? `${label} is ready.` : `${label} is empty.`)}
            </p>
        </div>
    );
}
