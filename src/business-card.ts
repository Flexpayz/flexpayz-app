import VCard from "vcard-creator";
import {Languages} from "./languages";
import type {Product} from "./control-state";

export type SharedContact = {
    name: string;
    email: string;
    phone: string;
    date: number;
    message?: string;
    consentAccepted?: true;
    consentVersion?: string;
};

export type BusinessCardField = keyof Pick<Product,
    "firstName" |
    "lastName" |
    "title" |
    "email" |
    "email2" |
    "email3" |
    "phoneNumber" |
    "phoneNumber2" |
    "phoneNumber3" |
    "website" |
    "website2" |
    "about" |
    "address" |
    "address2" |
    "zipCode" |
    "city" |
    "country" |
    "linkedIn" |
    "instagram" |
    "facebook" |
    "youtube" |
    "tiktok" |
    "companyName" |
    "companyRegNumber" |
    "companyAddress" |
    "companyCity" |
    "companyCountry" |
    "companyPhoneNumber" |
    "companyAbout" |
    "businessFile" |
    "cv" |
    "logo" |
    "previewLanguage"
>;

export const BUSINESS_CARD_FIELDS: BusinessCardField[] = [
    "firstName",
    "lastName",
    "title",
    "email",
    "email2",
    "email3",
    "phoneNumber",
    "phoneNumber2",
    "phoneNumber3",
    "website",
    "website2",
    "about",
    "address",
    "address2",
    "zipCode",
    "city",
    "country",
    "linkedIn",
    "instagram",
    "facebook",
    "youtube",
    "tiktok",
    "companyName",
    "companyRegNumber",
    "companyAddress",
    "companyCity",
    "companyCountry",
    "companyPhoneNumber",
    "companyAbout",
    "businessFile",
    "cv",
    "logo",
    "previewLanguage",
];

const STRING_FIELDS = BUSINESS_CARD_FIELDS.filter((field) => field !== "cv" && field !== "previewLanguage") as Exclude<BusinessCardField, "cv" | "previewLanguage">[];

export type BusinessCardProduct = Product & {
    sharedContacts: SharedContact[];
};

export function normalizeBusinessCardProduct(rawProduct?: Partial<Product> | null): BusinessCardProduct {
    const normalized: Product = {
        ...(rawProduct || {}),
        previewLanguage: rawProduct?.previewLanguage || Languages.ENGLISH,
        cv: Boolean(rawProduct?.cv),
        sharedContacts: normalizeSharedContacts(rawProduct?.sharedContacts),
    } as Product;

    STRING_FIELDS.forEach((field) => {
        const value = normalized[field];
        normalized[field] = typeof value === "string" ? value : "" as never;
    });

    return normalized as BusinessCardProduct;
}

export function normalizeSharedContacts(rawContacts: unknown): SharedContact[] {
    if (!Array.isArray(rawContacts)) return [];

    return rawContacts
        .filter((contact) => contact && typeof contact === "object")
        .map((contact: any) => ({
            name: safeString(contact.name),
            email: safeString(contact.email),
            phone: safeString(contact.phone),
            date: typeof contact.date === "number" ? contact.date : 0,
            ...(safeString(contact.message) ? {message: safeString(contact.message)} : {}),
            ...(contact.consentAccepted === true ? {consentAccepted: true as const} : {}),
            ...(safeString(contact.consentVersion) ? {consentVersion: safeString(contact.consentVersion)} : {}),
        }))
        .filter((contact) => contact.name || contact.email || contact.phone);
}

export function serializeBusinessCardUpdate(product: Product) {
    const normalized = normalizeBusinessCardProduct(product);
    const update: Partial<Product> = {};

    BUSINESS_CARD_FIELDS.forEach((field) => {
        update[field] = normalized[field] as never;
    });

    return update;
}

export function calculateBusinessCardCompletion(product: Product, hasProfileImage = false) {
    const normalized = normalizeBusinessCardProduct(product);
    const checks = [
        Boolean(normalized.firstName.trim()),
        Boolean(normalized.lastName.trim()),
        Boolean(normalized.title.trim()),
        Boolean(normalized.email.trim() || normalized.phoneNumber.trim()),
        hasProfileImage,
        Boolean(normalized.about.trim()),
        Boolean(normalized.companyName.trim()),
        Boolean(normalized.website.trim() || normalized.linkedIn.trim() || normalized.instagram.trim() || normalized.facebook.trim() || normalized.youtube.trim() || normalized.tiktok.trim()),
        Boolean(normalized.cv && normalized.businessFile.trim()),
    ];
    const complete = checks.filter(Boolean).length;

    return Math.round((complete / checks.length) * 100);
}

export function buildBusinessVCard(product: Product, logoUrl?: string) {
    const normalized = normalizeBusinessCardProduct(product);
    const vCard = new VCard();

    vCard.addName(normalized.lastName, normalized.firstName);
    if (normalized.title) vCard.addJobtitle(normalized.title);
    if (normalized.companyName) vCard.addCompany(normalized.companyName);
    if (normalized.address || normalized.city || normalized.country) {
        vCard.addAddress(formatAddress(normalized));
    }
    [normalized.email, normalized.email2, normalized.email3].filter(Boolean).forEach((email, index) => {
        vCard.addEmail(email, index === 0 ? "Email" : `Email ${index + 1}`);
    });
    [normalized.phoneNumber, normalized.phoneNumber2, normalized.phoneNumber3].filter(Boolean).forEach((phone, index) => {
        vCard.addPhoneNumber(phone, index === 0 ? "Phone" : `Phone ${index + 1}`);
    });
    [normalized.website, normalized.website2].filter(Boolean).forEach((website, index) => {
        vCard.addURL(normalizeExternalUrl(website), index === 0 ? "Website" : `Website ${index + 1}`);
    });
    [
        ["LinkedIn", normalized.linkedIn],
        ["Instagram", normalized.instagram],
        ["Facebook", normalized.facebook],
        ["YouTube", normalized.youtube],
        ["TikTok", normalized.tiktok],
    ].forEach(([label, value]) => {
        if (value) vCard.addSocial(value, label);
    });
    if (normalized.about || normalized.companyAbout) vCard.addNote(normalized.about || normalized.companyAbout);
    if (logoUrl) vCard.addLogoURL(logoUrl);

    return vCard.toString();
}

export function downloadGeneratedVCard(product: Product, logoUrl?: string) {
    const vCard = buildBusinessVCard(product, logoUrl);
    const blob = new Blob([vCard], {type: "text/vcard"});
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${buildContactFilename(product)}.vcf`;
    link.click();
    window.URL.revokeObjectURL(url);
}

export function buildContactFilename(product: Product) {
    const normalized = normalizeBusinessCardProduct(product);
    const fullName = [normalized.firstName, normalized.lastName].filter(Boolean).join("-").trim();
    return (fullName || normalized.companyName || "FlexPayz-contact").replace(/[^a-z0-9-_]+/gi, "-");
}

export function normalizeExternalUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^(https?:)?\/\//i.test(trimmed)) {
        return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    }
    if (/^mailto:|^tel:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

export function sanitizePhoneHref(value: string) {
    const cleaned = value.replace(/[^\d+]/g, "");
    return cleaned ? `tel:${cleaned}` : "";
}

export function sanitizeMailHref(value: string) {
    const trimmed = value.trim();
    return trimmed ? `mailto:${trimmed}` : "";
}

export function isValidEmail(value: string) {
    if (!value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidUrlDraft(value: string) {
    if (!value.trim()) return true;
    try {
        new URL(normalizeExternalUrl(value));
        return true;
    } catch {
        return false;
    }
}

export function formatAddress(product: Product) {
    return [
        product.address,
        product.address2,
        product.zipCode,
        product.city,
        product.country,
    ].filter(Boolean).join(", ");
}

export function formatCompanyAddress(product: Product) {
    return [
        product.companyAddress,
        product.companyCity,
        product.companyCountry,
    ].filter(Boolean).join(", ");
}

export function getPublicName(product: Product) {
    const fullName = [product.firstName, product.lastName].filter(Boolean).join(" ").trim();
    return fullName || product.companyName || "FlexPayz profile";
}

export function getInitials(product: Product, fallback = "FP") {
    const source = [product.firstName, product.lastName].filter(Boolean).join(" ") || product.companyName || fallback;
    const initials = source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
    return initials || fallback;
}

function safeString(value: unknown) {
    return typeof value === "string" ? value : "";
}
