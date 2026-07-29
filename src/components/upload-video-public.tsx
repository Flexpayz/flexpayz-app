import {useMemo, useState} from "react";
import {CircularProgress} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import YouTube, {YouTubeEvent} from "react-youtube";
import {Product} from "../control-state";
import {FlexPayzLogo} from "./design-system";
import {
    ParsedYouTubeUrl,
    YouTubeVideoMetadata,
    getFallbackYouTubeMetadata,
    getYouTubePlayerErrorMessage,
    parseYouTubeUrl,
} from "../youtube-video";

type UploadVideoPublicPageProps = {
    product: Product;
    productId: string;
    fromDashboard?: boolean;
};

type PlaybackState = "poster" | "loading" | "playing" | "ended" | "error";

export function UploadVideoPublicPage({product, productId, fromDashboard = false}: UploadVideoPublicPageProps) {
    const parsed = useMemo(() => parseYouTubeUrl(product.youtubeLink || ""), [product.youtubeLink]);
    const metadata = useMemo(() => parsed ? getFallbackYouTubeMetadata(parsed) : null, [parsed]);
    const [pageShareMessage, setPageShareMessage] = useState("");

    const sharePage = async () => {
        const url = window.location.href;
        setPageShareMessage("");

        if (navigator.share) {
            try {
                await navigator.share({title: `${product.name || "FlexPayz"} featured video`, url});
                return;
            } catch (error: any) {
                if (error?.name === "AbortError") return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setPageShareMessage("Page link copied.");
        } catch {
            setPageShareMessage("Copy the page URL from your browser.");
        }
    };

    const goBackToContent = () => {
        if (fromDashboard && productId) {
            window.location.href = `/show-product?product_id=${encodeURIComponent(productId)}`;
            return;
        }
        window.history.back();
    };

    return (
        <section className="upload-video-public-page" aria-label="Featured video">
            <div className="upload-files-public-circles" aria-hidden="true"><span/><span/></div>
            <header className="upload-files-public-header">
                <FlexPayzLogo className="upload-files-public-logo"/>
                <div>
                    <span className="upload-files-public-language">EN</span>
                    <button className="upload-files-public-share" type="button" onClick={sharePage}>Share page <ArrowOutwardRoundedIcon fontSize="small"/></button>
                </div>
            </header>

            <main className="upload-video-public-main">
                {!parsed || !metadata ? (
                    <VideoUnavailableState
                        title="Featured video unavailable"
                        message="This device does not have a valid public YouTube video right now."
                        fromDashboard={fromDashboard}
                        onBack={goBackToContent}
                    />
                ) : (
                    <>
                        <section className="upload-video-public-heading">
                            <p className="business-kicker">{product.name || "FlexPayz product"}</p>
                            <h1>Featured video</h1>
                            <p>A focused, poster-first viewing experience without pulling attention away from the content.</p>
                        </section>
                        <UploadVideoPlayer parsed={parsed} metadata={metadata} fromDashboard={fromDashboard} onBack={goBackToContent}/>
                    </>
                )}
            </main>

            <footer className="upload-files-public-footer">
                <span>{pageShareMessage || "Playback remains user-initiated"}</span>
                <strong>Powered by FlexPayz</strong>
            </footer>
        </section>
    );
}

function UploadVideoPlayer({
    parsed,
    metadata,
    fromDashboard,
    onBack,
}: {
    parsed: ParsedYouTubeUrl;
    metadata: YouTubeVideoMetadata;
    fromDashboard: boolean;
    onBack(): void;
}) {
    const [playbackState, setPlaybackState] = useState<PlaybackState>("poster");
    const [errorMessage, setErrorMessage] = useState("");

    const startPlayback = () => {
        setPlaybackState("loading");
        setErrorMessage("");
    };

    const openYouTube = () => {
        window.open(parsed.canonicalUrl, "_blank", "noopener,noreferrer");
    };

    const retryPlayback = () => {
        setPlaybackState("poster");
        setErrorMessage("");
        window.setTimeout(startPlayback, 0);
    };

    return (
        <section className="upload-video-public-workspace">
            <div className={`upload-video-public-player state-${playbackState}`}>
                {playbackState === "poster" || playbackState === "ended" ? (
                    <PublicVideoPoster
                        parsed={parsed}
                        metadata={metadata}
                        ended={playbackState === "ended"}
                        onPlay={startPlayback}
                    />
                ) : playbackState === "error" ? (
                    <div className="upload-video-public-error-panel" role="alert">
                        <WarningAmberRoundedIcon/>
                        <h2>This video can’t be played here.</h2>
                        <p>{errorMessage || "Check your connection or open it on YouTube."}</p>
                        <div>
                            <button type="button" onClick={retryPlayback}>Try again <ReplayRoundedIcon fontSize="small"/></button>
                            <button type="button" onClick={openYouTube}>Open YouTube <ArrowOutwardRoundedIcon fontSize="small"/></button>
                        </div>
                    </div>
                ) : (
                    <>
                        {playbackState === "loading" && (
                            <div className="upload-video-public-loading" role="status">
                                <CircularProgress size={24} color="inherit"/>
                                <span>Loading video controls…</span>
                            </div>
                        )}
                        <YouTube
                            videoId={parsed.videoId}
                            title={metadata.title}
                            className="upload-video-public-iframe"
                            iframeClassName="upload-video-public-iframe"
                            opts={{playerVars: {autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1}}}
                            onReady={() => {
                                setPlaybackState("playing");
                            }}
                            onEnd={() => setPlaybackState("ended")}
                            onError={(event: YouTubeEvent<number>) => {
                                setPlaybackState("error");
                                setErrorMessage(getYouTubePlayerErrorMessage(event.data));
                            }}
                        />
                    </>
                )}
            </div>

            <div className="upload-video-public-details">
                <div>
                    <p className="business-kicker">NOW SHOWING</p>
                    <h2>{metadata.title}</h2>
                    <p>{metadata.authorName} · YouTube</p>
                </div>
                <span><CheckRoundedIcon fontSize="small"/> User initiated</span>
                <button type="button" onClick={openYouTube}>Watch on YouTube <ArrowOutwardRoundedIcon fontSize="small"/></button>
                <div className="upload-video-public-notes">
                    <strong>You’re in control</strong>
                    <p>Playback begins only after you tap Play. Standard YouTube controls remain available.</p>
                </div>
                {fromDashboard && (
                    <button type="button" className="upload-video-public-back" onClick={onBack}>
                        <ArrowBackRoundedIcon fontSize="small"/> Back to content
                    </button>
                )}
            </div>
        </section>
    );
}

function PublicVideoPoster({
    parsed,
    metadata,
    ended,
    onPlay,
}: {
    parsed: ParsedYouTubeUrl;
    metadata: YouTubeVideoMetadata;
    ended: boolean;
    onPlay(): void;
}) {
    const [thumbnailIndex, setThumbnailIndex] = useState(0);
    const thumbnail = thumbnailIndex === 0 ? metadata.thumbnailUrl : parsed.thumbnailUrls[Math.min(thumbnailIndex - 1, parsed.thumbnailUrls.length - 1)];

    return (
        <div className="upload-video-public-poster">
            <img src={thumbnail} alt={`Poster for ${metadata.title}`} onError={() => setThumbnailIndex((index) => Math.min(index + 1, parsed.thumbnailUrls.length))}/>
            <span aria-hidden="true"/>
            <button type="button" onClick={onPlay} aria-label={ended ? `Replay ${metadata.title}` : `Play ${metadata.title}`}>
                {ended ? <ReplayRoundedIcon/> : <PlayArrowRoundedIcon/>}
            </button>
            <strong>{ended ? "Replay video" : metadata.title}</strong>
        </div>
    );
}

function VideoUnavailableState({
    title,
    message,
    fromDashboard,
    onBack,
}: {
    title: string;
    message: string;
    fromDashboard: boolean;
    onBack(): void;
}) {
    return (
        <div className="upload-video-public-unavailable" role="alert">
            <WarningAmberRoundedIcon/>
            <h1>{title}</h1>
            <p>{message}</p>
            {fromDashboard && <button type="button" onClick={onBack}><ArrowBackRoundedIcon fontSize="small"/> Back to content</button>}
        </div>
    );
}
