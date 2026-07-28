import {FullMetadata} from "firebase/storage";
import {Product} from "./control-state";

export type UploadFileSlotId = "file1" | "file2" | "file3";
export type UploadFileFieldName = "filename1" | "filename2" | "filename3";

export type UploadFileSlotDefinition = {
    id: UploadFileSlotId;
    field: UploadFileFieldName;
    number: 1 | 2 | 3;
    label: string;
    storageName: string;
};

export type UploadFileMetadataState = {
    exists: boolean;
    metadata?: FullMetadata;
    error?: "missing" | "unavailable";
};

export type UploadFilePublicDocument = {
    slot: UploadFileSlotDefinition;
    displayName: string;
    originalName: string;
    sizeLabel: string;
    contentType: string;
    storagePath: string;
};

export const PDF_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PDF_ACCEPT = ["application/pdf", ".pdf"];
export const DISPLAY_NAME_MAX_LENGTH = 80;

export const UPLOAD_FILE_SLOTS: UploadFileSlotDefinition[] = [
    {id: "file1", field: "filename1", number: 1, label: "File 1", storageName: "file1"},
    {id: "file2", field: "filename2", number: 2, label: "File 2", storageName: "file2"},
    {id: "file3", field: "filename3", number: 3, label: "File 3", storageName: "file3"},
];

export function getUploadFileStoragePath(productId: string, slot: UploadFileSlotDefinition) {
    return `documents/${productId}/${slot.storageName}`;
}

export async function validatePdfFile(file: File) {
    if (file.size === 0) {
        return "Choose a PDF that is not empty.";
    }

    if (file.size > PDF_MAX_SIZE_BYTES) {
        return `PDF must be ${formatFileSize(PDF_MAX_SIZE_BYTES)} or smaller.`;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".pdf")) {
        return "Only PDF documents are supported.";
    }

    if (file.type && file.type !== "application/pdf") {
        return "The selected file does not look like a PDF.";
    }

    const signature = await readFileSignature(file);
    if (signature && !signature.startsWith("%PDF-")) {
        return "The selected file is not a valid PDF document.";
    }

    return null;
}

export function validateDisplayName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "Enter a display name before publishing this document.";
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) return `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
    return null;
}

export function buildUploadFileNameUpdate(
    draftNames: Record<UploadFileFieldName, string>,
    currentProduct: Pick<Product, UploadFileFieldName>,
) {
    const update: Partial<Pick<Product, UploadFileFieldName>> = {};

    UPLOAD_FILE_SLOTS.forEach((slot) => {
        const nextValue = (draftNames[slot.field] || "").trim();
        const currentValue = currentProduct[slot.field] || "";
        if (nextValue !== currentValue) {
            update[slot.field] = nextValue;
        }
    });

    return update;
}

export function getReadyUploadFileDocuments(
    product: Pick<Product, UploadFileFieldName>,
    productId: string,
    metadataBySlot: Record<UploadFileSlotId, UploadFileMetadataState>,
) {
    return UPLOAD_FILE_SLOTS.reduce<UploadFilePublicDocument[]>((documents, slot) => {
        const displayName = (product[slot.field] || "").trim();
        const metadataState = metadataBySlot[slot.id];
        if (!displayName || !metadataState?.exists) return documents;

        const metadata = metadataState.metadata;
        documents.push({
            slot,
            displayName,
            originalName: metadata?.customMetadata?.originalName || metadata?.name || displayName || slot.label,
            sizeLabel: metadata?.size ? formatFileSize(metadata.size) : "PDF",
            contentType: metadata?.contentType || "application/pdf",
            storagePath: getUploadFileStoragePath(productId, slot),
        });
        return documents;
    }, []);
}

export function getSafePdfDownloadName(displayName: string) {
    const trimmed = displayName.trim() || "FlexPayz document";
    return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

export function formatFileSize(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "PDF";
    if (bytes < 1024) return `${bytes} B`;
    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

async function readFileSignature(file: File) {
    if (!file.slice) return "";
    try {
        const slice = file.slice(0, 5);
        if (slice.text) return await slice.text();
        if (slice.arrayBuffer) {
            const bytes = new Uint8Array(await slice.arrayBuffer());
            return String.fromCharCode(...Array.from(bytes));
        }
        if (typeof Response !== "undefined") {
            return await new Response(slice).text();
        }
        return "";
    } catch {
        return "";
    }
}
