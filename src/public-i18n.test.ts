import {
    getPublicLanguageStorageKey,
    getPublicLanguageUrlParam,
    normalizePublicLanguage,
    parsePublicLanguageCode,
    withPublicLanguageParam,
} from "./public-i18n";
import {Languages} from "./languages";

describe("public i18n helpers", () => {
    it("normalizes supported language values and falls back to English", () => {
        expect(normalizePublicLanguage(Languages.SWEDISH)).toBe(Languages.SWEDISH);
        expect(normalizePublicLanguage(Languages.FRENCH)).toBe(Languages.FRENCH);
        expect(normalizePublicLanguage("legacy")).toBe(Languages.ENGLISH);
        expect(normalizePublicLanguage(undefined)).toBe(Languages.ENGLISH);
    });

    it("parses public URL language codes", () => {
        expect(parsePublicLanguageCode("en")).toBe(Languages.ENGLISH);
        expect(parsePublicLanguageCode("sv")).toBe(Languages.SWEDISH);
        expect(parsePublicLanguageCode("fr")).toBe(Languages.FRENCH);
        expect(parsePublicLanguageCode("de")).toBeNull();
    });

    it("maps languages back to compact public URL codes", () => {
        expect(getPublicLanguageUrlParam(Languages.ENGLISH)).toBe("en");
        expect(getPublicLanguageUrlParam(Languages.SWEDISH)).toBe("sv");
        expect(getPublicLanguageUrlParam(Languages.FRENCH)).toBe("fr");
    });

    it("uses per-product visitor storage keys", () => {
        expect(getPublicLanguageStorageKey("product-1")).toBe("flexpayz.publicLanguage.product-1");
        expect(getPublicLanguageStorageKey("product-2")).toBe("flexpayz.publicLanguage.product-2");
    });

    it("adds or replaces the lang query param without dropping existing params", () => {
        expect(withPublicLanguageParam("/show-product?product_id=p1&section=upload-files", Languages.FRENCH))
            .toBe("/show-product?product_id=p1&section=upload-files&lang=fr");
        expect(withPublicLanguageParam("/show-product?product_id=p1&lang=sv", Languages.ENGLISH))
            .toBe("/show-product?product_id=p1&lang=en");
    });
});
