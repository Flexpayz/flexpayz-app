import {useMemo, useState} from "react";
import {CircularProgress} from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import YouTube, {YouTubeEvent} from "react-youtube";
import {Product} from "../control-state";
import {BackButton} from "./design-system";
import {PublicPageHeader} from "./public-page-header";
import {TranslatePublicCopy, usePublicLanguage, withPublicLanguageParam} from "../public-i18n";
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
    const {language, t} = usePublicLanguage();

    const goBackToContent = () => {
        if (fromDashboard && productId) {
            window.location.href = withPublicLanguageParam(`/show-product?product_id=${encodeURIComponent(productId)}`, language);
            return;
        }
        window.history.back();
    };

    return (
        <section className="upload-video-public-page" aria-label={t("video.aria")}>
            <div className="upload-files-public-circles" aria-hidden="true"><span/><span/></div>
            <PublicPageHeader productId={productId} fromDashboard={fromDashboard} shareTitle={t("video.shareTitle", {name: product.name || "FlexPayz"})} onShareMessage={setPageShareMessage}/>

            <main className="upload-video-public-main">
                {!parsed || !metadata ? (
                    <VideoUnavailableState
                        title={t("video.unavailable.title")}
                        message={t("video.unavailable.message")}
                        fromDashboard={fromDashboard}
                        onBack={goBackToContent}
                        t={t}
                    />
                ) : (
                    <>
                        <section className="upload-video-public-heading">
                            <p className="business-kicker">{product.name || "FlexPayz product"}</p>
                            <h1>{t("video.title")}</h1>
                            <p>{t("video.description")}</p>
                        </section>
                        <UploadVideoPlayer parsed={parsed} metadata={metadata} fromDashboard={fromDashboard} onBack={goBackToContent} t={t}/>
                    </>
                )}
            </main>

            <footer className="upload-files-public-footer">
                <span>{pageShareMessage || t("public.footer.secure")}</span>
            </footer>
        </section>
    );
}

function UploadVideoPlayer({
    parsed,
    metadata,
    fromDashboard,
    onBack,
    t,
}: {
    parsed: ParsedYouTubeUrl;
    metadata: YouTubeVideoMetadata;
    fromDashboard: boolean;
    onBack(): void;
    t: TranslatePublicCopy;
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
                        t={t}
                    />
                ) : playbackState === "error" ? (
                    <div className="upload-video-public-error-panel" role="alert">
                        <WarningAmberRoundedIcon/>
                        <h2>{t("video.error.title")}</h2>
                        <p>{errorMessage || t("video.error.message")}</p>
                        <div>
                            <button type="button" onClick={retryPlayback}>{t("video.tryAgain")} <ReplayRoundedIcon fontSize="small"/></button>
                            <button type="button" onClick={openYouTube}>{t("video.openYoutube")} <ArrowOutwardRoundedIcon fontSize="small"/></button>
                        </div>
                    </div>
                ) : (
                    <>
                        {playbackState === "loading" && (
                            <div className="upload-video-public-loading" role="status">
                                <CircularProgress size={24} color="inherit"/>
                                <span>{t("video.loadingControls")}</span>
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
                    <p className="business-kicker">{t("video.nowShowing")}</p>
                    <h2>{metadata.title}</h2>
                    <p>{metadata.authorName} · YouTube</p>
                </div>
                <span><CheckRoundedIcon fontSize="small"/> {t("video.userInitiated")}</span>
                <button type="button" onClick={openYouTube}>{t("video.watchYoutube")} <ArrowOutwardRoundedIcon fontSize="small"/></button>
                <div className="upload-video-public-notes">
                    <strong>{t("video.controlTitle")}</strong>
                    <p>{t("video.controlText")}</p>
                </div>
                {fromDashboard && (
                    <BackButton aria-label={t("public.back.content")} className="upload-video-public-back" onClick={onBack}/>
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
    t,
}: {
    parsed: ParsedYouTubeUrl;
    metadata: YouTubeVideoMetadata;
    ended: boolean;
    onPlay(): void;
    t: TranslatePublicCopy;
}) {
    const [thumbnailIndex, setThumbnailIndex] = useState(0);
    const thumbnail = thumbnailIndex === 0 ? metadata.thumbnailUrl : parsed.thumbnailUrls[Math.min(thumbnailIndex - 1, parsed.thumbnailUrls.length - 1)];

    return (
        <div className="upload-video-public-poster">
            <img src={thumbnail} alt={`Poster for ${metadata.title}`} onError={() => setThumbnailIndex((index) => Math.min(index + 1, parsed.thumbnailUrls.length))}/>
            <span aria-hidden="true"/>
            <button type="button" onClick={onPlay} aria-label={ended ? t("video.replayLabel", {title: metadata.title}) : t("video.playLabel", {title: metadata.title})}>
                {ended ? <ReplayRoundedIcon/> : <PlayArrowRoundedIcon/>}
            </button>
            <strong>{ended ? t("video.replay") : metadata.title}</strong>
        </div>
    );
}

function VideoUnavailableState({
    title,
    message,
    fromDashboard,
    onBack,
    t,
}: {
    title: string;
    message: string;
    fromDashboard: boolean;
    onBack(): void;
    t: TranslatePublicCopy;
}) {
    return (
        <div className="upload-video-public-unavailable" role="alert">
            <WarningAmberRoundedIcon/>
            <h1>{title}</h1>
            <p>{message}</p>
            {fromDashboard && <BackButton aria-label={t("public.back.content")} onClick={onBack}/>}
        </div>
    );
}
