import {
    calculateBusinessCardCompletion,
    buildBusinessVCard,
    normalizeBusinessCardProduct,
    normalizeExternalUrl,
    normalizeSharedContacts,
    serializeBusinessCardUpdate,
} from "./business-card";
import {Languages} from "./languages";
import {Preview} from "./preview";

const baseProduct: any = {
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    email2: "",
    email3: "",
    phoneNumber: "",
    phoneNumber2: "",
    phoneNumber3: "",
    website: "",
    website2: "",
    about: "",
    address: "",
    address2: "",
    zipCode: "",
    city: "",
    country: "",
    linkedIn: "",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
    companyName: "",
    companyRegNumber: "",
    companyAddress: "",
    companyCity: "",
    companyCountry: "",
    companyPhoneNumber: "",
    companyAbout: "",
    businessFile: "",
    cv: false,
    logo: "",
    previewLanguage: Languages.ENGLISH,
    sharedContacts: [],
};

describe("Business Card compatibility", () => {
    it("normalizes legacy flat products without writing defaults", () => {
        const normalized = normalizeBusinessCardProduct({
            firstName: "Elena",
            lastName: null as any,
            previewLanguage: undefined,
            cv: undefined as any,
            color1: "#123456",
            color2: "#abcdef",
        });

        expect(normalized.firstName).toBe("Elena");
        expect(normalized.lastName).toBe("");
        expect(normalized.previewLanguage).toBe(Languages.ENGLISH);
        expect(normalized.cv).toBe(false);
        expect(normalized.color1).toBe("#123456");
        expect(normalized.color2).toBe("#abcdef");
    });

    it("keeps secondary legacy email and phone values", () => {
        const normalized = normalizeBusinessCardProduct({
            email2: "work@example.com",
            email3: "hello@example.com",
            phoneNumber2: "+40 111",
            phoneNumber3: "+40 222",
        });

        expect(normalized.email2).toBe("work@example.com");
        expect(normalized.email3).toBe("hello@example.com");
        expect(normalized.phoneNumber2).toBe("+40 111");
        expect(normalized.phoneNumber3).toBe("+40 222");
    });

    it("serializes only allowlisted Business Card fields", () => {
        const update = serializeBusinessCardUpdate({
            ...baseProduct,
            firstName: "Elena",
            visibleSections: [Preview.BUSINESS_CARD, Preview.CUSTOM_LINK],
            publicPagePassword: "secret",
            unlockCode: "A7C9F2",
            customLink: "https://example.com",
            color1: "#123456",
            color2: "#abcdef",
        });

        expect(update.firstName).toBe("Elena");
        expect(update).not.toHaveProperty("visibleSections");
        expect(update).not.toHaveProperty("publicPagePassword");
        expect(update).not.toHaveProperty("unlockCode");
        expect(update).not.toHaveProperty("customLink");
        expect(update).not.toHaveProperty("color1");
        expect(update).not.toHaveProperty("color2");
    });

    it("reads legacy and new shared contact entries safely", () => {
        expect(normalizeSharedContacts([
            {name: "Alex", email: "alex@example.com", phone: "+40", date: 1},
            {name: "Mara", email: "", phone: "+41", message: "Follow up", consentAccepted: true, date: 2},
        ])).toEqual([
            {name: "Alex", email: "alex@example.com", phone: "+40", date: 1},
            {name: "Mara", email: "", phone: "+41", message: "Follow up", consentAccepted: true, date: 2},
        ]);
    });

    it("calculates completion client-side", () => {
        expect(calculateBusinessCardCompletion({
            ...baseProduct,
            firstName: "Elena",
            lastName: "Marin",
            title: "Consultant",
            email: "elena@example.com",
            about: "Helpful profile",
        }, true)).toBeGreaterThanOrEqual(60);
    });

    it("generates a vCard from normalized canonical fields", () => {
        const vCard = buildBusinessVCard({
            ...baseProduct,
            firstName: "Elena",
            lastName: "Marin",
            title: "Consultant",
            email: "elena@example.com",
            email2: "work@example.com",
            phoneNumber: "+40 722",
            companyName: "Atelier North",
            website: "ateliernorth.co",
        });

        expect(vCard).toContain("Elena");
        expect(vCard).toContain("Marin");
        expect(vCard).toContain("elena@example.com");
        expect(vCard).toContain("work@example.com");
        expect(vCard).toContain("Atelier North");
    });

    it("normalizes public URLs to https", () => {
        expect(normalizeExternalUrl("ateliernorth.co")).toBe("https://ateliernorth.co");
        expect(normalizeExternalUrl("https://ateliernorth.co")).toBe("https://ateliernorth.co");
    });
});
