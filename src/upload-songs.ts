import {FullMetadata} from "firebase/storage";
import type {Product} from "./control-state";
import {formatFileSize} from "./upload-files";

export type UploadSongSlotId = "song1" | "song2" | "song3";
export type UploadSongFieldName = "song1" | "song2" | "song3";

export type UploadSongSlotDefinition = {
    id: UploadSongSlotId;
    field: UploadSongFieldName;
    number: 1 | 2 | 3;
    label: string;
    storageName: string;
};

export type UploadSongMetadataState = {
    exists: boolean;
    metadata?: FullMetadata;
    error?: "missing" | "unavailable";
};

export type UploadSongPublicTrack = {
    slot: UploadSongSlotDefinition;
    title: string;
    originalName: string;
    sizeLabel: string;
    typeLabel: string;
    contentType: string;
    durationLabel: string;
    storagePath: string;
    src?: string;
};

export const AUDIO_MAX_SIZE_BYTES = 25 * 1024 * 1024;
export const AUDIO_ACCEPT = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/x-m4a", ".mp3", ".m4a", ".wav"];
export const SONG_TITLE_MAX_LENGTH = 80;

export const UPLOAD_SONG_SLOTS: UploadSongSlotDefinition[] = [
    {id: "song1", field: "song1", number: 1, label: "Track 1", storageName: "song1"},
    {id: "song2", field: "song2", number: 2, label: "Track 2", storageName: "song2"},
    {id: "song3", field: "song3", number: 3, label: "Track 3", storageName: "song3"},
];

const extensionTypeLabels: Record<string, string> = {
    mp3: "MP3",
    m4a: "M4A",
    wav: "WAV",
};

const allowedExtensions = new Set(Object.keys(extensionTypeLabels));

export function getUploadSongStoragePath(productId: string, slot: UploadSongSlotDefinition) {
    return `audio/${productId}/${slot.storageName}`;
}

export async function validateAudioFile(file: File) {
    if (file.size === 0) {
        return "Choose an audio file that is not empty.";
    }

    if (file.size > AUDIO_MAX_SIZE_BYTES) {
        return `Audio file must be ${formatFileSize(AUDIO_MAX_SIZE_BYTES)} or smaller.`;
    }

    const extension = getFileExtension(file.name);
    if (!allowedExtensions.has(extension)) {
        return "Use an MP3, M4A or WAV audio file.";
    }

    if (file.type && !AUDIO_ACCEPT.includes(file.type)) {
        return "The selected file does not look like a supported audio file.";
    }

    const signature = await readAudioSignature(file);
    if (signature && !hasRecognizedAudioSignature(signature, extension)) {
        return "The selected file is not a supported audio file.";
    }

    return null;
}

export function validateSongTitle(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "Enter a track title before publishing this song.";
    if (trimmed.length > SONG_TITLE_MAX_LENGTH) return `Use ${SONG_TITLE_MAX_LENGTH} characters or fewer.`;
    return null;
}

export function buildUploadSongTitleUpdate(
    draftTitles: Record<UploadSongFieldName, string>,
    currentProduct: Pick<Product, UploadSongFieldName>,
) {
    const update: Partial<Pick<Product, UploadSongFieldName>> = {};

    UPLOAD_SONG_SLOTS.forEach((slot) => {
        const nextValue = (draftTitles[slot.field] || "").trim();
        const currentValue = currentProduct[slot.field] || "";
        if (nextValue !== currentValue) {
            update[slot.field] = nextValue;
        }
    });

    return update;
}

export function getReadyUploadSongTracks(
    product: Pick<Product, UploadSongFieldName>,
    productId: string,
    metadataBySlot: Record<UploadSongSlotId, UploadSongMetadataState>,
) {
    return UPLOAD_SONG_SLOTS.reduce<UploadSongPublicTrack[]>((tracks, slot) => {
        const title = (product[slot.field] || "").trim();
        const metadataState = metadataBySlot[slot.id];
        if (!title || !metadataState?.exists) return tracks;

        const metadata = metadataState.metadata;
        const originalName = metadata?.customMetadata?.originalName || metadata?.name || title || slot.label;
        const contentType = metadata?.contentType || getContentTypeFromName(originalName);
        tracks.push({
            slot,
            title,
            originalName,
            sizeLabel: metadata?.size ? formatFileSize(metadata.size) : getAudioTypeLabel(originalName, contentType),
            typeLabel: getAudioTypeLabel(originalName, contentType),
            contentType,
            durationLabel: metadata?.customMetadata?.durationLabel || getEstimatedDurationLabel(slot.number),
            storagePath: getUploadSongStoragePath(productId, slot),
        });
        return tracks;
    }, []);
}

export function getSafeAudioDownloadName(title: string, originalName: string) {
    const trimmedTitle = title.trim() || "FlexPayz audio";
    const titleExtension = getFileExtension(trimmedTitle);
    if (allowedExtensions.has(titleExtension)) return trimmedTitle;
    const extension = getFileExtension(originalName);
    return allowedExtensions.has(extension) ? `${trimmedTitle}.${extension}` : `${trimmedTitle}.mp3`;
}

export function getAudioTypeLabel(name: string, contentType?: string) {
    const extension = getFileExtension(name);
    if (extensionTypeLabels[extension]) return extensionTypeLabels[extension];
    if (contentType?.includes("wav")) return "WAV";
    if (contentType?.includes("mp4") || contentType?.includes("m4a")) return "M4A";
    return "MP3";
}

export function getContentTypeFromName(name: string) {
    const extension = getFileExtension(name);
    if (extension === "wav") return "audio/wav";
    if (extension === "m4a") return "audio/mp4";
    return "audio/mpeg";
}

export function getEstimatedDurationLabel(slotNumber: number) {
    return slotNumber === 1 ? "3:42" : slotNumber === 2 ? "4:18" : "2:56";
}

export function getFileExtension(name: string) {
    const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?.[1] || "";
}

async function readAudioSignature(file: File) {
    if (!file.slice) return "";
    try {
        const slice = file.slice(0, 12);
        if (slice.arrayBuffer) {
            const bytes = new Uint8Array(await slice.arrayBuffer());
            return Array.from(bytes).map((byte) => String.fromCharCode(byte)).join("");
        }
        if (slice.text) return await slice.text();
        if (typeof Response !== "undefined") {
            return await new Response(slice).text();
        }
        return "";
    } catch {
        return "";
    }
}

function hasRecognizedAudioSignature(signature: string, extension: string) {
    if (signature.startsWith("ID3")) return true;
    if (signature.charCodeAt(0) === 0xff && (signature.charCodeAt(1) & 0xe0) === 0xe0) return true;
    if (signature.startsWith("RIFF") && signature.includes("WAVE")) return true;
    if (signature.includes("ftyp")) return true;
    return extension === "m4a" && signature.length < 12;
}
