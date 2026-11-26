import {getDownloadURL, ref} from "firebase/storage";
import {storage} from "./App";
import {UploadFilePublicDocument, getSafePdfDownloadName} from "./upload-files";

export type DocumentActionResult =
    | {status: "success"}
    | {status: "cancelled"}
    | {status: "unsupported"; message: string}
    | {status: "error"; message: string};

export async function fetchPublicDocumentBlob(document: UploadFilePublicDocument) {
    const downloadUrl = await getDownloadURL(ref(storage, document.storagePath));
    const response = await fetch(downloadUrl);
    if (!response.ok) {
        throw new Error("download-failed");
    }
    return await response.blob();
}

export async function downloadPublicDocument(document: UploadFilePublicDocument): Promise<DocumentActionResult> {
    try {
        const blob = await fetchPublicDocumentBlob(document);
        const objectUrl = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = objectUrl;
        link.download = getSafePdfDownloadName(document.displayName);
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
        return {status: "success"};
    } catch (error: any) {
        if (error?.code === "storage/object-not-found") {
            return {status: "error", message: "This document is no longer available."};
        }
        return {status: "error", message: "Download failed. Try again."};
    }
}

export async function sharePublicDocument(document: UploadFilePublicDocument): Promise<DocumentActionResult> {
    try {
        const blob = await fetchPublicDocumentBlob(document);
        const file = new File([blob], getSafePdfDownloadName(document.displayName), {type: "application/pdf"});
        const shareData = {files: [file], title: document.displayName};
        if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
            return {status: "unsupported", message: "File sharing is not supported here. Download the document instead."};
        }
        await navigator.share(shareData);
        return {status: "success"};
    } catch (error: any) {
        if (error?.name === "AbortError") return {status: "cancelled"};
        if (error?.code === "storage/object-not-found") {
            return {status: "error", message: "This document is no longer available."};
        }
        return {status: "error", message: "Sharing failed. Download the document instead."};
    }
}

export async function shareCurrentPublicPage() {
    const url = window.location.href;
    try {
        if (navigator.share) {
            await navigator.share({title: "FlexPayz shared documents", url});
            return "Page shared";
        }
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            return "Page link copied";
        }
        return "Copy this page URL from your browser.";
    } catch (error: any) {
        if (error?.name === "AbortError") return "Share cancelled";
        return "Page sharing unavailable";
    }
}
