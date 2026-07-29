import {
    buildYouTubeLinkUpdate,
    fetchYouTubeMetadata,
    getYouTubeInputError,
    getYouTubePlayerErrorMessage,
    parseYouTubeUrl,
} from "./youtube-video";

const videoId = "dQw4w9WgXcQ";

describe("youtube-video parser", () => {
    it.each([
        [`https://www.youtube.com/watch?v=${videoId}`, videoId],
        [`https://youtube.com/watch?v=${videoId}&si=abc&t=42`, videoId],
        [`https://m.youtube.com/watch?v=${videoId}#fragment`, videoId],
        [`https://youtu.be/${videoId}?si=abc`, videoId],
        [`https://www.youtube.com/shorts/${videoId}?feature=share`, videoId],
        [`https://youtube.com/embed/${videoId}`, videoId],
        [`https://www.youtube.com/live/${videoId}?feature=share`, videoId],
        [`https://www.youtube-nocookie.com/embed/${videoId}`, videoId],
        [` youtube.com/watch?v=${videoId} `, videoId],
    ])("parses %s", (url, expectedVideoId) => {
        const parsed = parseYouTubeUrl(url);
        expect(parsed?.videoId).toBe(expectedVideoId);
        expect(parsed?.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${expectedVideoId}`);
        expect(parsed?.embedUrl).toBe(`https://www.youtube.com/embed/${expectedVideoId}`);
        expect(parsed?.thumbnailUrls[0]).toContain(expectedVideoId);
    });

    it.each([
        "",
        "https://vimeo.com/123",
        "https://youtube.com.example.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/playlist?list=PL123",
        "https://www.youtube.com/channel/UC123",
        "https://www.youtube.com/watch?v=bad",
        "not a url",
    ])("rejects %s", (url) => {
        expect(parseYouTubeUrl(url)).toBeNull();
    });

    it("builds targeted youtubeLink updates", () => {
        expect(buildYouTubeLinkUpdate(`youtu.be/${videoId}`)).toEqual({youtubeLink: `https://www.youtube.com/watch?v=${videoId}`});
        expect(buildYouTubeLinkUpdate("")).toEqual({youtubeLink: ""});
    });

    it("returns useful validation feedback", () => {
        expect(getYouTubeInputError("")).toBe("");
        expect(getYouTubeInputError("https://vimeo.com/123")).toBe("Enter a valid YouTube, youtu.be or YouTube Shorts URL.");
    });

    it("loads oEmbed metadata without requiring an API key", async () => {
        const parsed = parseYouTubeUrl(`https://youtu.be/${videoId}`)!;
        const fetcher = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({title: "Featured video", author_name: "FlexPayz", thumbnail_url: "https://thumb.test/video.jpg"}),
        });

        await expect(fetchYouTubeMetadata(parsed, fetcher as any)).resolves.toEqual({
            title: "Featured video",
            authorName: "FlexPayz",
            thumbnailUrl: "https://thumb.test/video.jpg",
            source: "oembed",
        });
        expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("youtube.com%2Fwatch%3Fv%3D"));
    });

    it("falls back when metadata cannot be loaded", async () => {
        const parsed = parseYouTubeUrl(`https://youtu.be/${videoId}`)!;
        const metadata = await fetchYouTubeMetadata(parsed, jest.fn().mockRejectedValue(new Error("network")) as any);
        expect(metadata).toMatchObject({title: "YouTube video", authorName: "YouTube", source: "fallback"});
    });

    it("maps player errors to visitor-safe copy", () => {
        expect(getYouTubePlayerErrorMessage(100)).toContain("unavailable");
        expect(getYouTubePlayerErrorMessage(150)).toContain("Embedding unavailable");
        expect(getYouTubePlayerErrorMessage()).toContain("can’t be played");
    });
});
