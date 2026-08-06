import {CSSProperties, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CircularProgress} from "@mui/material";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import {getDownloadURL, getMetadata, ref} from "firebase/storage";
import {storage} from "../App";
import {Product} from "../control-state";
import {
    UPLOAD_SONG_SLOTS,
    UploadSongMetadataState,
    UploadSongPublicTrack,
    UploadSongSlotId,
    getReadyUploadSongTracks,
    getUploadSongStoragePath,
} from "../upload-songs";
import {LoadingPanel} from "./design-system";
import {PublicPageHeader} from "./public-page-header";

type MetadataBySlot = Record<UploadSongSlotId, UploadSongMetadataState>;
type LoadState = "loading" | "ready" | "error";

const emptyMetadata: MetadataBySlot = {
    song1: {exists: false},
    song2: {exists: false},
    song3: {exists: false},
};

export function UploadSongsPublicPage({product, productId, fromDashboard = false}: {product: Product; productId: string; fromDashboard?: boolean}) {
    const [metadataBySlot, setMetadataBySlot] = useState<MetadataBySlot>(emptyMetadata);
    const [trackUrls, setTrackUrls] = useState<Record<UploadSongSlotId, string>>({song1: "", song2: "", song3: ""});
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [pageShareMessage, setPageShareMessage] = useState("");

    useEffect(() => {
        let active = true;

        async function loadTracks() {
            if (!productId) {
                setLoadState("error");
                return;
            }

            const entries = await Promise.all(
                UPLOAD_SONG_SLOTS.map(async (slot) => {
                    try {
                        const storageRef = ref(storage, getUploadSongStoragePath(productId, slot));
                        const [metadata, url] = await Promise.all([getMetadata(storageRef), getDownloadURL(storageRef)]);
                        return [slot.id, {metadata: {exists: true, metadata}, url}] as const;
                    } catch (error: any) {
                        return [slot.id, {metadata: {exists: false, error: error?.code === "storage/object-not-found" ? "missing" : "unavailable"} as UploadSongMetadataState, url: ""}] as const;
                    }
                }),
            );

            if (!active) return;
            setMetadataBySlot(entries.reduce<MetadataBySlot>((state, [slotId, value]) => ({...state, [slotId]: value.metadata}), emptyMetadata));
            setTrackUrls(entries.reduce<Record<UploadSongSlotId, string>>((state, [slotId, value]) => ({...state, [slotId]: value.url}), {song1: "", song2: "", song3: ""}));
            setLoadState("ready");
        }

        loadTracks().catch(() => {
            if (active) setLoadState("error");
        });

        return () => {
            active = false;
        };
    }, [productId]);

    const tracks = useMemo(() => (
        getReadyUploadSongTracks(product, productId, metadataBySlot)
            .map((track) => ({...track, src: trackUrls[track.slot.id]}))
            .filter((track) => Boolean(track.src))
    ), [metadataBySlot, product, productId, trackUrls]);

    return (
        <section className="upload-songs-public-page" aria-label="Audio collection">
            <div className="upload-files-public-circles" aria-hidden="true"><span/><span/></div>
            <PublicPageHeader productId={productId} fromDashboard={fromDashboard} shareTitle={`${product.name || "FlexPayz"} audio collection`} onShareMessage={setPageShareMessage}/>

            <main className="upload-songs-public-main">
                {loadState === "loading" ? (
                    <LoadingPanel text="Loading audio collection"/>
                ) : loadState === "error" ? (
                    <UploadSongsPublicState title="Audio collection unavailable" message="Refresh and try again."/>
                ) : tracks.length === 0 ? (
                    <UploadSongsPublicState title="No tracks are ready yet." message="This device has no public audio tracks right now."/>
                ) : (
                    <UploadSongsPlayer product={product} tracks={tracks}/>
                )}
            </main>

            <footer className="upload-files-public-footer">
                <span>{pageShareMessage || "Secure · contactless · yours"}</span>
                <strong>Powered by FlexPayz</strong>
            </footer>
        </section>
    );
}

function UploadSongsPlayer({product, tracks}: {product: Product; tracks: UploadSongPublicTrack[]}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [playbackError, setPlaybackError] = useState("");
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const activeTrack = tracks[activeIndex];

    useEffect(() => {
        setIsPlaying(false);
        setPlaybackError("");
        setCurrentTime(0);
        audioRef.current?.load();
    }, [activeIndex]);

    const playTrack = useCallback(async () => {
        if (!audioRef.current) return;
        setPlaybackError("");
        try {
            await audioRef.current.play();
            setIsPlaying(true);
        } catch {
            setPlaybackError(`Couldn’t play “${activeTrack.title}”. Check your connection and try again.`);
            setIsPlaying(false);
        }
    }, [activeTrack.title]);

    const pauseTrack = () => {
        audioRef.current?.pause();
        setIsPlaying(false);
    };

    const togglePlay = () => {
        if (isPlaying) pauseTrack();
        else playTrack();
    };

    const selectTrack = (index: number) => {
        setActiveIndex(index);
    };

    const playRelative = async (direction: 1 | -1) => {
        const nextIndex = activeIndex + direction;
        if (nextIndex < 0 || nextIndex >= tracks.length) return;
        setActiveIndex(nextIndex);
        window.setTimeout(() => {
            audioRef.current?.play().catch(() => setPlaybackError("Playback could not continue. Choose a track and try again."));
        }, 0);
    };

    return (
        <>
            <div className="upload-songs-public-hero">
                <div className="upload-songs-public-titlemark" aria-hidden="true"><MusicNoteRoundedIcon/></div>
                <div>
                    <p className="business-kicker">{product.name || "FlexPayz product"}</p>
                    <h1>Audio collection</h1>
                    <p>{tracks.length === 1 ? "One track" : `${tracks.length} tracks`} · choose one to start playback.</p>
                </div>
            </div>

            <div className="upload-songs-public-workspace">
                <section className="upload-songs-playlist" aria-labelledby="upload-songs-playlist-title">
                    <p className="business-kicker" id="upload-songs-playlist-title">PLAYLIST</p>
                    <ol>
                        {tracks.map((track, index) => (
                            <li key={track.slot.id}>
                                <button
                                    type="button"
                                    className={index === activeIndex ? "is-active" : ""}
                                    onClick={() => selectTrack(index)}
                                    aria-current={index === activeIndex ? "true" : undefined}
                                >
                                    <span>{String(index + 1).padStart(2, "0")}</span>
                                    <strong>{track.title}</strong>
                                    <small>{track.slot.label}</small>
                                    <Waveform active={index === activeIndex}/>
                                    <em>{track.durationLabel}</em>
                                    {index === activeIndex && isPlaying ? <PauseRoundedIcon/> : <PlayArrowRoundedIcon/>}
                                </button>
                            </li>
                        ))}
                    </ol>
                    <p className="upload-songs-public-note">Secure · contactless · yours</p>
                </section>

                <section className="upload-songs-now-playing" aria-labelledby="upload-songs-now-playing-title">
                    <audio
                        ref={audioRef}
                        preload="metadata"
                        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
                        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                        onWaiting={() => setIsBuffering(true)}
                        onPlaying={() => {
                            setIsBuffering(false);
                            setIsPlaying(true);
                        }}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => {
                            setIsPlaying(false);
                            if (activeIndex < tracks.length - 1) setActiveIndex((index) => index + 1);
                        }}
                        onError={() => {
                            setPlaybackError(`Couldn’t play “${activeTrack.title}”. Check your connection and try again.`);
                            setIsPlaying(false);
                            setIsBuffering(false);
                        }}
                    >
                        <source src={activeTrack.src} type={activeTrack.contentType}/>
                    </audio>
                    <p className="business-kicker" id="upload-songs-now-playing-title">NOW PLAYING</p>
                    <h2>{activeTrack.title}</h2>
                    <span>Track {activeIndex + 1} of {tracks.length}</span>
                    <Waveform active/>
                    <div className="upload-songs-progress-row">
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            step={0.1}
                            value={Math.min(currentTime, duration || 0)}
                            onChange={(event) => {
                                const nextTime = event.currentTarget.valueAsNumber;
                                setCurrentTime(nextTime);
                                if (audioRef.current) audioRef.current.currentTime = nextTime;
                            }}
                            aria-label={`Seek ${activeTrack.title}`}
                        />
                        <small>{formatTime(currentTime)}</small>
                        <small>{formatTime(duration)}</small>
                    </div>
                    <div className="upload-songs-controls">
                        <button type="button" onClick={() => playRelative(-1)} disabled={activeIndex === 0} aria-label="Previous track"><SkipPreviousRoundedIcon/></button>
                        <button type="button" onClick={togglePlay} aria-label={isPlaying ? `Pause ${activeTrack.title}` : `Play ${activeTrack.title}`}>
                            {isBuffering ? <CircularProgress size={20} color="inherit"/> : isPlaying ? <PauseRoundedIcon/> : <PlayArrowRoundedIcon/>}
                        </button>
                        <button type="button" onClick={() => playRelative(1)} disabled={activeIndex === tracks.length - 1} aria-label="Next track"><SkipNextRoundedIcon/></button>
                    </div>
                    <label className="upload-songs-volume">
                        <span>Volume</span>
                        <VolumeUpRoundedIcon fontSize="small"/>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={(event) => {
                                const nextVolume = event.currentTarget.valueAsNumber;
                                setVolume(nextVolume);
                                if (audioRef.current) audioRef.current.volume = nextVolume;
                            }}
                        />
                    </label>
                    <p className="upload-songs-playback-message" role={playbackError ? "alert" : "status"}>{playbackError || (isBuffering ? "Buffering audio…" : "Playback stays on this page")}</p>
                </section>
            </div>
        </>
    );
}

function Waveform({active}: {active?: boolean}) {
    return (
        <span className={`upload-songs-waveform-public ${active ? "is-active" : ""}`} aria-hidden="true">
            {Array.from({length: 28}).map((_, index) => <i key={index} style={{"--wave-height": `${22 + ((index * 17) % 56)}%`} as CSSProperties}/>)}
        </span>
    );
}

function UploadSongsPublicState({title, message, loading}: {title: string; message: string; loading?: boolean}) {
    return (
        <div className="upload-files-public-empty" role={loading ? "status" : "alert"}>
            <span aria-hidden="true">{loading ? <CircularProgress size={24} color="inherit"/> : <MusicNoteRoundedIcon/>}</span>
            <h2>{title}</h2>
            <p>{message}</p>
        </div>
    );
}

function formatTime(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
