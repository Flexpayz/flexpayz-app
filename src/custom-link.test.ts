import {buildCustomLinkUpdate, getCustomLinkDisplayLabel, parseCustomLink} from "./custom-link";

describe("Custom Link URL handling", () => {
    it("adds HTTPS to bare domains and keeps the path", () => {
        const parsed = parseCustomLink("ateliernorth.co/book");

        expect(parsed.isValid).toBe(true);
        expect(parsed.isSecure).toBe(true);
        expect(parsed.protocolAdded).toBe(true);
        expect(parsed.normalizedUrl).toBe("https://ateliernorth.co/book");
        expect(parsed.displayHostname).toBe("ateliernorth.co");
        expect(parsed.path).toBe("/book");
    });

    it("preserves query and fragment values in the saved URL", () => {
        const parsed = parseCustomLink(" HTTPS://WWW.AtelierNorth.CO/Book?Ref=FlexPayz#Top ");

        expect(parsed.normalizedUrl).toBe("https://www.ateliernorth.co/Book?Ref=FlexPayz#Top");
        expect(parsed.displayHostname).toBe("ateliernorth.co");
        expect(parsed.path).toBe("/Book?…#…");
    });

    it("allows legacy HTTP links but marks them as not secure", () => {
        const parsed = parseCustomLink("http://example.com/menu");

        expect(parsed.isValid).toBe(true);
        expect(parsed.isSecure).toBe(false);
        expect(parsed.normalizedUrl).toBe("http://example.com/menu");
    });

    it("normalizes protocol-relative URLs to HTTPS", () => {
        const parsed = parseCustomLink("//example.com/menu");

        expect(parsed.isValid).toBe(true);
        expect(parsed.protocolAdded).toBe(true);
        expect(parsed.normalizedUrl).toBe("https://example.com/menu");
    });

    it("rejects empty, malformed and unsafe destinations", () => {
        expect(parseCustomLink("").issue).toBe("empty");
        expect(parseCustomLink("https://").issue).toBe("invalid");
        expect(parseCustomLink("atelier north").isValid).toBe(false);
        expect(parseCustomLink("mailto:hello@example.com").issue).toBe("unsupported-protocol");
        expect(parseCustomLink("javascript:alert(1)").issue).toBe("unsupported-protocol");
        expect(parseCustomLink("https://user:pass@example.com").issue).toBe("credentials");
    });

    it("builds a targeted Firestore update for the existing customLink field only", () => {
        const update = buildCustomLinkUpdate("example.com");

        expect(update).toEqual({customLink: "https://example.com"});
        expect(update).not.toHaveProperty("preview");
        expect(update).not.toHaveProperty("visibleSections");
    });

    it("uses the hostname as the display label", () => {
        expect(getCustomLinkDisplayLabel(parseCustomLink("https://www.example.com/page"))).toBe("example.com");
    });
});
