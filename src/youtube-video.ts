export type ParsedYouTubeUrl = {
    videoId: string;
    canonicalUrl: string;
    embedUrl: string;
    thumbnailUrls: string[];
};

export type YouTubeVideoMetadata = {
    title: string;
    authorName: string;
    thumbnailUrl: string;
    durationLabel?: string;
    source: "oembed" | "fallback";
};

export type YouTubeMetadataStatus = "idle" | "checking" | "found" | "unavailable" | "invalid";

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const OEMBED_ENDPOINT = "https://www.youtube.com/oembed";

export function parseYouTubeUrl(value: string): ParsedYouTubeUrl | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const candidate = addProtocolIfMissing(trimmed);
    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        return null;
    }

    const hostname = url.hostname.toLowerCase();
    const videoId = extractVideoId(url, hostname);
    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) return null;

    return buildParsedYouTubeUrl(videoId);
}

export function buildParsedYouTubeUrl(videoId: string): ParsedYouTubeUrl {
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
        videoId,
        canonicalUrl,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrls: [
            `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        ],
    };
}

export async function fetchYouTubeMetadata(
    parsed: ParsedYouTubeUrl,
    fetcher: typeof fetch = fetch,
): Promise<YouTubeVideoMetadata> {
    try {
        const endpoint = new URL(OEMBED_ENDPOINT);
        endpoint.searchParams.set("url", parsed.canonicalUrl);
        endpoint.searchParams.set("format", "json");
        const response = await fetcher(endpoint.toString());
        if (!response.ok) throw new Error("oEmbed unavailable");
        const data = await response.json();
        return {
            title: data.title || "YouTube video",
            authorName: data.author_name || "YouTube",
            thumbnailUrl: data.thumbnail_url || parsed.thumbnailUrls[0],
            source: "oembed",
        };
    } catch {
        return getFallbackYouTubeMetadata(parsed);
    }
}

export function getFallbackYouTubeMetadata(parsed: ParsedYouTubeUrl): YouTubeVideoMetadata {
    return {
        title: "YouTube video",
        authorName: "YouTube",
        thumbnailUrl: parsed.thumbnailUrls[0],
        source: "fallback",
    };
}

export function buildYouTubeLinkUpdate(value: string) {
    const parsed = parseYouTubeUrl(value);
    return {youtubeLink: parsed?.canonicalUrl || ""};
}

export function getYouTubeInputError(value: string) {
    if (!value.trim()) return "";
    return parseYouTubeUrl(value) ? "" : "Enter a valid YouTube, youtu.be or YouTube Shorts URL.";
}

export function getYouTubePlayerErrorMessage(errorCode?: number) {
    if (errorCode === 2 || errorCode === 100) {
        return "This video is unavailable. It may be private, restricted or removed.";
    }
    if (errorCode === 101 || errorCode === 150) {
        return "Embedding unavailable. Open this video on YouTube instead.";
    }
    return "This video can’t be played here. Check your connection or open it on YouTube.";
}

function addProtocolIfMissing(value: string) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
    return `https://${value}`;
}

function extractVideoId(url: URL, hostname: string) {
    if (hostname === "youtu.be") {
        return getPathSegment(url, 0);
    }

    if (isYouTubeNoCookieHost(hostname)) {
        return getPathSegment(url, 1, "embed");
    }

    if (!isYouTubeHost(hostname)) return null;

    if (url.pathname === "/watch") {
        return url.searchParams.get("v");
    }

    return getPathSegment(url, 1, "shorts")
        || getPathSegment(url, 1, "embed")
        || getPathSegment(url, 1, "live");
}

function getPathSegment(url: URL, index: number, expectedPrefix?: string) {
    const segments = url.pathname.split("/").filter(Boolean);
    if (expectedPrefix && segments[0] !== expectedPrefix) return null;
    return segments[index] || null;
}

function isYouTubeHost(hostname: string) {
    return hostname === "youtube.com"
        || hostname === "www.youtube.com"
        || hostname === "m.youtube.com";
}

function isYouTubeNoCookieHost(hostname: string) {
    return hostname === "youtube-nocookie.com" || hostname === "www.youtube-nocookie.com";
}
