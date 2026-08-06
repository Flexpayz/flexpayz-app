import {useMemo, useState} from "react";
import {deleteObject, getDownloadURL, ref} from "firebase/storage";
import {storage} from "../App";
import {PDF_ACCEPT, PDF_MAX_SIZE_BYTES, formatFileSize, validatePdfFile} from "../upload-files";
import {useResumableFileUpload} from "../useResumableFileUpload";
import {getProductIdFromURL} from "../utils";
import type {Asset, DB_STORAGE} from "./baby-journal-settings";
import {FileUploadField, UploadedFileState} from "./file-upload-field";

type JournalFileUploadProps = {
    value: Asset[];
    onChange: (assets: Asset[]) => void;
    multiple?: boolean;
    maxFiles?: number;
    storageFolder: DB_STORAGE;
    storageKey: string;
    label?: string;
};

export function JournalFileUpload({
    value,
    onChange,
    multiple = false,
    maxFiles = 1,
    storageFolder,
    storageKey,
    label = "Journal document",
}: JournalFileUploadProps) {
    const assets = value || [];
    const uploadSlots = multiple && assets.length < maxFiles ? 1 : 0;
    const slotCount = multiple ? assets.length + uploadSlots : 1;

    return (
        <div className="journal-file-upload-list">
            {Array.from({length: slotCount}).map((_, index) => (
                <JournalFileUploadSlot
                    key={assets[index]?.url || index}
                    asset={assets[index]}
                    index={index}
                    label={`${label} ${multiple ? index + 1 : ""}`.trim()}
                    assets={assets}
                    onChange={onChange}
                    storageFolder={storageFolder}
                    storageKey={storageKey}
                    multiple={multiple}
                    remainingSlots={Math.max(maxFiles - assets.length, 1)}
                />
            ))}
        </div>
    );
}

function JournalFileUploadSlot({
    asset,
    index,
    label,
    assets,
    onChange,
    storageFolder,
    storageKey,
    multiple,
    remainingSlots,
}: {
    asset?: Asset;
    index: number;
    label: string;
    assets: Asset[];
    onChange: (assets: Asset[]) => void;
    storageFolder: DB_STORAGE;
    storageKey: string;
    multiple: boolean;
    remainingSlots: number;
}) {
    const productId = getProductIdFromURL();
    const [errorMessage, setErrorMessage] = useState("");
    const uploadPath = buildJournalStoragePath(storageFolder, productId || "", storageKey, index);
    const {state, upload, cancel, retry, reset} = useResumableFileUpload({storagePath: uploadPath, validateFile: validatePdfFile});

    const fileState = useMemo<UploadedFileState>(() => ({
        displayName: asset?.name || label,
        originalName: asset?.name || label,
        sizeLabel: "PDF",
        typeLabel: "PDF",
        status: asset?.url ? "ready" : "empty",
        errorMessage,
    }), [asset?.name, asset?.url, errorMessage, label]);

    const uploadFileAtIndex = async (file: File, targetIndex: number, baseAssets = assets, commit = true) => {
        if (!productId) return null;
        setErrorMessage("");
        const targetUploadPath = buildJournalStoragePath(storageFolder, productId, storageKey, targetIndex);
        const metadata = await upload(file, {
            contentType: "application/pdf",
            customMetadata: {originalName: file.name},
        }, targetUploadPath);
        if (!metadata) return null;

        const downloadUrl = await getDownloadURL(ref(storage, targetUploadPath));
        const nextAssets = [...baseAssets];
        nextAssets[targetIndex] = {name: file.name, url: downloadUrl};
        if (commit) {
            onChange(nextAssets.filter((nextAsset) => nextAsset?.url));
        }
        reset();
        return nextAssets;
    };

    const startUpload = async (file: File) => {
        await uploadFileAtIndex(file, index);
    };

    const startUploadFiles = async (files: File[]) => {
        const filesToUpload = files.slice(0, remainingSlots);
        let nextAssets = [...assets];
        for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += 1) {
            const updatedAssets = await uploadFileAtIndex(filesToUpload[fileIndex], index + fileIndex, nextAssets, false);
            if (updatedAssets) {
                nextAssets = updatedAssets;
            }
        }
        onChange(nextAssets.filter((nextAsset) => nextAsset?.url));
    };

    const removeFile = async () => {
        if (!asset) return;
        setErrorMessage("");
        try {
            await deleteObject(ref(storage, asset.url));
            onChange(assets.filter((_, assetIndex) => assetIndex !== index));
        } catch {
            setErrorMessage("File could not be removed. Try again.");
        }
    };

    return (
        <FileUploadField
            label={label}
            accept={PDF_ACCEPT}
            maxSizeBytes={PDF_MAX_SIZE_BYTES}
            file={fileState}
            uploadState={state}
            disabled={!productId}
            allowMultiple={multiple && !asset}
            maxSelectableFiles={remainingSlots}
            onSelect={startUpload}
            onSelectFiles={startUploadFiles}
            onReplace={startUpload}
            onCancel={cancel}
            onRetry={async () => {
                const metadata = await retry();
                if (!metadata) return;
                const downloadUrl = await getDownloadURL(ref(storage, uploadPath));
                const nextAssets = [...assets];
                nextAssets[index] = {name: state.fileName || metadata.customMetadata?.originalName || label, url: downloadUrl};
                onChange(nextAssets.filter((nextAsset) => nextAsset?.url));
                reset();
            }}
            onRemove={asset ? removeFile : undefined}
            helperText={`Accepted format: PDF document · Maximum ${formatFileSize(PDF_MAX_SIZE_BYTES)}`}
        />
    );
}

function buildJournalStoragePath(storageFolder: DB_STORAGE, productId: string, storageKey: string, index: number) {
    return `${storageFolder}/${productId}/${storageKey}-${index + 1}.pdf`;
}
