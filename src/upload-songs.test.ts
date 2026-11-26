import {
    AUDIO_MAX_SIZE_BYTES,
    UPLOAD_SONG_SLOTS,
    buildUploadSongTitleUpdate,
    getAudioTypeLabel,
    getContentTypeFromName,
    getReadyUploadSongTracks,
    getSafeAudioDownloadName,
    getUploadSongStoragePath,
    validateAudioFile,
    validateSongTitle,
} from "./upload-songs";

function makeFile(name: string, type: string, parts: BlobPart[] = ["ID3 test audio"]) {
    return new File(parts, name, {type});
}

describe("upload-songs helpers", () => {
    it("preserves the fixed Storage paths", () => {
        expect(UPLOAD_SONG_SLOTS.map((slot) => getUploadSongStoragePath("product-1", slot))).toEqual([
            "audio/product-1/song1",
            "audio/product-1/song2",
            "audio/product-1/song3",
        ]);
    });

    it("validates supported audio files", async () => {
        await expect(validateAudioFile(makeFile("Golden Hour.mp3", "audio/mpeg"))).resolves.toBeNull();
        await expect(validateAudioFile(makeFile("Cover.png", "image/png"))).resolves.toBe("Use an MP3, M4A or WAV audio file.");
        await expect(validateAudioFile(makeFile("Track.mp3", "image/png"))).resolves.toBe("The selected file does not look like a supported audio file.");
        await expect(validateAudioFile(makeFile("Empty.mp3", "audio/mpeg", []))).resolves.toBe("Choose an audio file that is not empty.");
    });

    it("rejects oversized audio files", async () => {
        const oversized = makeFile("Large.mp3", "audio/mpeg", [new Blob([new Uint8Array(AUDIO_MAX_SIZE_BYTES + 1)])]);
        await expect(validateAudioFile(oversized)).resolves.toBe("Audio file must be 25 MB or smaller.");
    });

    it("validates public track titles", () => {
        expect(validateSongTitle("Golden Hour")).toBeNull();
        expect(validateSongTitle(" ")).toBe("Enter a track title before publishing this song.");
        expect(validateSongTitle("a".repeat(81))).toBe("Use 80 characters or fewer.");
    });

    it("saves only changed song title fields", () => {
        const product = {song1: "Golden Hour", song2: "Midnight Drive", song3: "", customLink: "https://example.com"} as any;
        expect(buildUploadSongTitleUpdate({song1: "Golden Hour", song2: "  New Drive  ", song3: ""}, product)).toEqual({song2: "New Drive"});
    });

    it("builds public tracks from title plus existing Storage metadata", () => {
        const product = {song3: "Soft Focus", song1: "Golden Hour", song2: ""} as any;
        const tracks = getReadyUploadSongTracks(product, "product-1", {
            song1: {exists: true, metadata: {name: "song1", size: 5600000, contentType: "audio/mpeg", customMetadata: {originalName: "golden-hour.mp3"}} as any},
            song2: {exists: true, metadata: {name: "song2", size: 7100000, contentType: "audio/mp4", customMetadata: {originalName: "midnight.m4a"}} as any},
            song3: {exists: true, metadata: {name: "song3", size: 3000000, contentType: "audio/wav", customMetadata: {originalName: "soft.wav"}} as any},
        });

        expect(tracks.map((track) => track.title)).toEqual(["Golden Hour", "Soft Focus"]);
        expect(tracks.map((track) => track.storagePath)).toEqual(["audio/product-1/song1", "audio/product-1/song3"]);
    });

    it("uses safe type and download-name fallbacks", () => {
        expect(getAudioTypeLabel("clip.m4a", "")).toBe("M4A");
        expect(getContentTypeFromName("clip.wav")).toBe("audio/wav");
        expect(getSafeAudioDownloadName("Golden Hour", "legacy")).toBe("Golden Hour.mp3");
        expect(getSafeAudioDownloadName("Golden Hour", "source.wav")).toBe("Golden Hour.wav");
        expect(getSafeAudioDownloadName("Golden Hour.mp3", "source.mp3")).toBe("Golden Hour.mp3");
    });
});
