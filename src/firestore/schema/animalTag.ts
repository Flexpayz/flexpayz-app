import {z} from "zod";
import {assetSchema, normalizeAssets, safeBoolean, safeString, stripUndefined} from "./primitives";

export const animalGenderSchema = z.union([
    z.literal("male"),
    z.literal("female"),
]);

export type AnimalGender = z.infer<typeof animalGenderSchema>;

export const animalTagContactSchema = z.object({
    name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
}).passthrough();

export const animalTagFirestoreSchema = z.object({
    photo: z.array(assetSchema).optional().nullable(),
    name: z.string().optional().nullable(),
    breed: z.string().optional().nullable(),
    age: z.string().optional().nullable(),
    weight: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    gender: animalGenderSchema.optional().nullable(),
    height: z.string().optional().nullable(),
    ownerMessage: z.string().optional().nullable(),
    contact: animalTagContactSchema.optional().nullable(),
    isLost: z.boolean().optional().nullable(),
}).passthrough();

export type AnimalTagFirestoreData = z.infer<typeof animalTagFirestoreSchema>;

export interface AnimalTagConfig {
    photo: {name: string; url: string}[];
    name: string;
    breed: string;
    age: string;
    weight: string;
    color: string;
    gender: AnimalGender;
    height: string;
    ownerMessage: string;
    contact: {
        name: string;
        phone: string;
        email: string;
        address: string;
    };
    isLost: boolean;
}

export type AnimalTagUpdateInput = Partial<AnimalTagConfig>;

export const defaultAnimalTagConfig: AnimalTagConfig = {
    photo: [],
    name: "",
    breed: "",
    age: "",
    weight: "",
    color: "",
    gender: "male",
    height: "",
    ownerMessage: "",
    contact: {
        name: "",
        phone: "",
        email: "",
        address: "",
    },
    isLost: false,
};

export function normalizeAnimalTag(raw: unknown): AnimalTagConfig {
    const parsed = animalTagFirestoreSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : {};
    const contact = data.contact || {};
    return {
        ...defaultAnimalTagConfig,
        photo: normalizeAssets(data.photo),
        name: safeString(data.name),
        breed: safeString(data.breed),
        age: safeString(data.age),
        weight: safeString(data.weight),
        color: safeString(data.color),
        gender: data.gender || defaultAnimalTagConfig.gender,
        height: safeString(data.height),
        ownerMessage: safeString(data.ownerMessage),
        contact: {
            name: safeString(contact.name),
            phone: safeString(contact.phone),
            email: safeString(contact.email),
            address: safeString(contact.address),
        },
        isLost: safeBoolean(data.isLost),
    };
}

export function serializeAnimalTagUpdate(input: AnimalTagUpdateInput) {
    return stripUndefined(input);
}
