import {z} from "zod";
import {Languages} from "../../languages";
import {Preview} from "../../preview";
import {normalizeStringArray, safeBoolean, safeString, stripUndefined} from "./primitives";

const previewLiteralSchema = z.union([
    z.nativeEnum(Preview),
    z.literal("upload_songs"),
    z.literal("baby_journal"),
    z.literal("adult_journal"),
]);

export type PreviewFirestoreValue = z.infer<typeof previewLiteralSchema>;

const languageSchema = z.nativeEnum(Languages);

export const sharedContactSchema = z.object({
    name: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    date: z.number().optional().nullable(),
    message: z.string().optional().nullable(),
    consentAccepted: z.literal(true).optional(),
    consentVersion: z.string().optional().nullable(),
}).passthrough();

export type SharedContact = {
    name: string;
    company?: string;
    email: string;
    phone: string;
    date: number;
    message?: string;
    consentAccepted?: true;
    consentVersion?: string;
};

const optionalString = z.string().optional().nullable();
const optionalBoolean = z.boolean().optional().nullable();

export const productFirestoreSchema = z.object({
    name: optionalString,
    activated: optionalBoolean,
    inactive: optionalBoolean,
    preview: previewLiteralSchema.optional().nullable(),
    visibleSections: z.array(previewLiteralSchema).optional().nullable(),
    unlockCode: optionalString,
    firstName: optionalString,
    lastName: optionalString,
    title: optionalString,
    email: optionalString,
    email2: optionalString,
    email3: optionalString,
    phoneNumber: optionalString,
    phoneNumber2: optionalString,
    phoneNumber3: optionalString,
    country: optionalString,
    address: optionalString,
    address2: optionalString,
    zipCode: optionalString,
    city: optionalString,
    linkedIn: optionalString,
    instagram: optionalString,
    facebook: optionalString,
    youtube: optionalString,
    tiktok: optionalString,
    about: optionalString,
    companyName: optionalString,
    companyRegNumber: optionalString,
    companyAddress: optionalString,
    companyCity: optionalString,
    companyCountry: optionalString,
    companyPhoneNumber: optionalString,
    companyAbout: optionalString,
    customLink: optionalString,
    filename1: optionalString,
    filename2: optionalString,
    filename3: optionalString,
    cv: optionalBoolean,
    website: optionalString,
    website2: optionalString,
    youtubeLink: optionalString,
    publicPagePassword: optionalString,
    publicPagePasswordActivated: optionalBoolean,
    color1: optionalString,
    color2: optionalString,
    logo: optionalString,
    song1: optionalString,
    song2: optionalString,
    song3: optionalString,
    businessFile: optionalString,
    sharedContacts: z.array(sharedContactSchema).optional().nullable(),
    previewLanguage: languageSchema.optional().nullable(),
    processed: optionalBoolean,
    category: optionalString,
    updatedAt: z.unknown().optional(),
}).passthrough();

export type ProductFirestoreData = z.infer<typeof productFirestoreSchema>;

export interface Product {
    name: string;
    activated: boolean;
    inactive: boolean;
    preview: Preview;
    visibleSections?: Preview[];
    unlockCode: string;
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    email2: string;
    email3: string;
    phoneNumber: string;
    phoneNumber2: string;
    phoneNumber3: string;
    country: string;
    address: string;
    address2: string;
    zipCode: string;
    city: string;
    linkedIn: string;
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok: string;
    about: string;
    companyName: string;
    companyRegNumber: string;
    companyAddress: string;
    companyCity: string;
    companyCountry: string;
    companyPhoneNumber: string;
    companyAbout: string;
    customLink: string;
    filename1: string;
    filename2: string;
    filename3: string;
    cv: boolean;
    website: string;
    website2: string;
    youtubeLink: string;
    publicPagePassword: string;
    publicPagePasswordActivated: boolean;
    color1: string;
    color2: string;
    logo: string;
    song1: string;
    song2: string;
    song3: string;
    businessFile: string;
    sharedContacts: SharedContact[];
    previewLanguage: Languages;
    processed?: boolean;
    category?: string;
    updatedAt?: unknown;
}

export type ProductCreateInput = Pick<Product, "activated" | "unlockCode" | "name" | "preview"> & {
    processed?: boolean;
};

export type ProductUpdateInput = Partial<Product>;
export type ProductReplacementInput = Product;

export const defaultProduct: Product = {
    name: "",
    activated: true,
    inactive: false,
    preview: Preview.BUSINESS_CARD,
    unlockCode: "",
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    email2: "",
    email3: "",
    phoneNumber: "",
    phoneNumber2: "",
    phoneNumber3: "",
    country: "",
    address: "",
    address2: "",
    zipCode: "",
    city: "",
    linkedIn: "",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
    about: "",
    companyName: "",
    companyRegNumber: "",
    companyAddress: "",
    companyCity: "",
    companyCountry: "",
    companyPhoneNumber: "",
    companyAbout: "",
    customLink: "",
    filename1: "",
    filename2: "",
    filename3: "",
    cv: false,
    website: "",
    website2: "",
    youtubeLink: "",
    publicPagePassword: "",
    publicPagePasswordActivated: false,
    color1: "#467083",
    color2: "#A3B0B5",
    logo: "",
    song1: "",
    song2: "",
    song3: "",
    businessFile: "",
    sharedContacts: [],
    previewLanguage: Languages.ENGLISH,
    visibleSections: undefined,
};

export function normalizePreview(value: unknown): Preview {
    if (value === "upload_songs") return Preview.UPLOAD_SONGS;
    if (value === "baby_journal") return Preview.BABY_JOURNAL;
    if (value === "adult_journal") return Preview.ADULT_JOURNAL;
    return Object.values(Preview).includes(value as Preview) ? value as Preview : Preview.BUSINESS_CARD;
}

export function normalizeVisibleSections(value: unknown): Preview[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return normalizeStringArray(value)
        .map(normalizePreview)
        .filter((section, index, sections) => sections.indexOf(section) === index);
}

export function normalizeSharedContacts(value: unknown): SharedContact[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((contact) => {
            const parsed = sharedContactSchema.safeParse(contact);
            if (!parsed.success) return null;
            const normalized: SharedContact = {
                name: safeString(parsed.data.name),
                email: safeString(parsed.data.email),
                phone: safeString(parsed.data.phone),
                date: typeof parsed.data.date === "number" ? parsed.data.date : 0,
            };
            const company = safeString(parsed.data.company);
            const message = safeString(parsed.data.message);
            const consentVersion = safeString(parsed.data.consentVersion);
            if (company) normalized.company = company;
            if (message) normalized.message = message;
            if (parsed.data.consentAccepted === true) normalized.consentAccepted = true;
            if (consentVersion) normalized.consentVersion = consentVersion;
            return normalized;
        })
        .filter((contact): contact is SharedContact => Boolean(contact && (contact.name || contact.email || contact.phone)));
}

export function normalizeProduct(raw: unknown): Product {
    const parsed = productFirestoreSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : {};
    const normalized: Product = {
        ...defaultProduct,
        name: safeString(data.name),
        activated: data.activated === undefined || data.activated === null ? defaultProduct.activated : safeBoolean(data.activated),
        inactive: safeBoolean(data.inactive),
        preview: normalizePreview(data.preview),
        visibleSections: normalizeVisibleSections(data.visibleSections),
        unlockCode: safeString(data.unlockCode),
        firstName: safeString(data.firstName),
        lastName: safeString(data.lastName),
        title: safeString(data.title),
        email: safeString(data.email),
        email2: safeString(data.email2),
        email3: safeString(data.email3),
        phoneNumber: safeString(data.phoneNumber),
        phoneNumber2: safeString(data.phoneNumber2),
        phoneNumber3: safeString(data.phoneNumber3),
        country: safeString(data.country),
        address: safeString(data.address),
        address2: safeString(data.address2),
        zipCode: safeString(data.zipCode),
        city: safeString(data.city),
        linkedIn: safeString(data.linkedIn),
        instagram: safeString(data.instagram),
        facebook: safeString(data.facebook),
        youtube: safeString(data.youtube),
        tiktok: safeString(data.tiktok),
        about: safeString(data.about),
        companyName: safeString(data.companyName),
        companyRegNumber: safeString(data.companyRegNumber),
        companyAddress: safeString(data.companyAddress),
        companyCity: safeString(data.companyCity),
        companyCountry: safeString(data.companyCountry),
        companyPhoneNumber: safeString(data.companyPhoneNumber),
        companyAbout: safeString(data.companyAbout),
        customLink: safeString(data.customLink),
        filename1: safeString(data.filename1),
        filename2: safeString(data.filename2),
        filename3: safeString(data.filename3),
        cv: safeBoolean(data.cv),
        website: safeString(data.website),
        website2: safeString(data.website2),
        youtubeLink: safeString(data.youtubeLink),
        publicPagePassword: safeString(data.publicPagePassword),
        publicPagePasswordActivated: safeBoolean(data.publicPagePasswordActivated),
        color1: safeString(data.color1) || defaultProduct.color1,
        color2: safeString(data.color2) || defaultProduct.color2,
        logo: safeString(data.logo),
        song1: safeString(data.song1),
        song2: safeString(data.song2),
        song3: safeString(data.song3),
        businessFile: safeString(data.businessFile),
        sharedContacts: normalizeSharedContacts(data.sharedContacts),
        previewLanguage: data.previewLanguage && Object.values(Languages).includes(data.previewLanguage) ? data.previewLanguage : Languages.ENGLISH,
        processed: data.processed === undefined || data.processed === null ? undefined : safeBoolean(data.processed),
        category: safeString(data.category) || undefined,
        updatedAt: data.updatedAt,
    };
    return normalized;
}

export function serializeProductCreate(input: ProductCreateInput): ProductCreateInput {
    return stripUndefined(input) as ProductCreateInput;
}

export function serializeProductUpdate(input: ProductUpdateInput): Partial<ProductFirestoreData> {
    return stripUndefined(input) as Partial<ProductFirestoreData>;
}
