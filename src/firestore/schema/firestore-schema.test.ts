import {Preview} from "../../preview";
import {Languages} from "../../languages";
import {normalizeAnimalTag, animalTagFirestoreSchema} from "./animalTag";
import {babyJournalFirestoreSchema, adultJournalFirestoreSchema} from "./journals";
import {normalizePermissions} from "./permissions";
import {normalizeDateLike, stripUndefined} from "./primitives";
import {normalizeProduct, normalizeVisibleSections, serializeProductUpdate} from "./products";
import {normalizeSerialNumber, serialNumberFirestoreSchema} from "./serialNumbers";
import {normalizeUserProfile} from "./users";

describe("Firestore schemas", () => {
    it("normalizes sparse legacy product documents", () => {
        const product = normalizeProduct({
            activated: false,
            unlockCode: "ABC123",
            name: "New Product",
            preview: "baby_journal",
            sharedContacts: [
                {name: "Ada", email: "ada@example.com", phone: "+4670", date: 123, consentAccepted: true},
                {name: "", email: "", phone: ""},
            ],
        });

        expect(product).toMatchObject({
            activated: false,
            inactive: false,
            unlockCode: "ABC123",
            name: "New Product",
            preview: Preview.BABY_JOURNAL,
            previewLanguage: Languages.ENGLISH,
            cv: false,
        });
        expect(product.sharedContacts).toEqual([
            {name: "Ada", email: "ada@example.com", phone: "+4670", date: 123, consentAccepted: true},
        ]);
    });

    it("accepts legacy visible-section literals and removes undefined update fields", () => {
        expect(normalizeVisibleSections(["upload_songs", "adult_journal", "upload_songs"])).toEqual([
            Preview.UPLOAD_SONGS,
            Preview.ADULT_JOURNAL,
        ]);
        expect(serializeProductUpdate({name: "Ring", category: undefined})).toEqual({name: "Ring"});
        expect(stripUndefined({name: "Ring", missing: undefined})).toEqual({name: "Ring"});
    });

    it("normalizes permissions, users, serial timestamps, and animal tag defaults", () => {
        expect(normalizePermissions({business_card: false, upload_files: null}).business_card).toBe(false);
        expect(normalizePermissions({business_card: false, upload_files: null}).upload_files).toBe(true);
        expect(normalizeUserProfile({country: "Sweden", products: ["p1", 7, "p2"]})).toEqual({
            country: "Sweden",
            products: ["p1", "p2"],
        });
        expect(normalizeSerialNumber({productID: "p1", createdAt: {toDate: () => new Date("2026-01-01T00:00:00.000Z")}})).toMatchObject({
            productID: "p1",
            type: "default",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        });
        expect(normalizeAnimalTag({contact: {email: "owner@example.com"}, gender: "female"})).toMatchObject({
            name: "",
            gender: "female",
            contact: {name: "", phone: "", email: "owner@example.com", address: ""},
            isLost: false,
        });
        expect(normalizeDateLike("2026-08-11")?.getFullYear()).toBe(2026);
    });

    it("rejects invalid enum values and invalid nested maps at the runtime schema boundary", () => {
        expect(serialNumberFirestoreSchema.safeParse({productID: "p1", type: "unknown"}).success).toBe(false);
        expect(animalTagFirestoreSchema.safeParse({gender: "unknown"}).success).toBe(false);
        expect(babyJournalFirestoreSchema.safeParse({sleepSchedule: []}).success).toBe(false);
        expect(adultJournalFirestoreSchema.safeParse({vitalSigns: []}).success).toBe(false);
    });
});
