import * as fs from "fs";
import * as path from "path";
import firebase from "firebase/compat/app";
import "firebase/compat/storage";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {doc, setDoc} from "firebase/firestore";

const describeRules = process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST ? describe : describe.skip;
const PROJECT_ID = "demo-flexpayz-storage-rules";

let testEnv: RulesTestEnvironment;

describeRules("Cloud Storage security rules", () => {
    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8"),
                host: "127.0.0.1",
                port: 8080,
            },
            storage: {
                rules: fs.readFileSync(path.resolve(__dirname, "../../../storage.rules"), "utf8"),
                host: "127.0.0.1",
                port: 9199,
            },
        });
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
        await testEnv.clearStorage();
        await seedBaseData();
        await seedStorageObjects();
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    it("allows admins to read and write every known storage root", async () => {
        const storage = adminStorage();

        await assertSucceeds(putObject(storage, "images/admin-product", "image/png"));
        await assertSucceeds(putObject(storage, "documents/admin-product/file1", "application/pdf"));
        await assertSucceeds(putObject(storage, "audio/admin-product/song1", "audio/mpeg"));
        await assertSucceeds(putObject(storage, "baby_journal/admin-product/record-1.pdf", "application/pdf"));
        await assertSucceeds(putObject(storage, "adult_journal/admin-product/profile.png", "image/png"));
        await assertSucceeds(putObject(storage, "animal_tag/admin-product/photo.png", "image/png"));
        await assertSucceeds(storage.ref("images/public-product").getMetadata());
    });

    it("allows product owners to write and delete current product media paths", async () => {
        const storage = ownerStorage();

        await assertSucceeds(putObject(storage, "images/owned-product", "image/png"));
        await assertSucceeds(putObject(storage, "images/logo-owned-product", "image/jpeg"));
        await assertSucceeds(putObject(storage, "documents/owned-product/file1", "application/pdf"));
        await assertSucceeds(putObject(storage, "documents/owned-product/vCard", "text/vcard"));
        await assertSucceeds(putObject(storage, "audio/owned-product/song1", "audio/mp4"));
        await assertSucceeds(putObject(storage, "baby_journal/owned-product/medical-record-1.pdf", "application/pdf"));
        await assertSucceeds(putObject(storage, "adult_journal/owned-product/profile.png", "image/png"));
        await assertSucceeds(putObject(storage, "animal_tag/owned-product/pet.png", "image/png"));
        await assertSucceeds(storage.ref("images/owned-product").delete());
    });

    it("allows public reads only for active non-inactive products", async () => {
        const storage = publicStorage();

        await assertSucceeds(storage.ref("images/public-product").getMetadata());
        await assertSucceeds(storage.ref("images/logo-public-product").getMetadata());
        await assertSucceeds(storage.ref("images/legacy-public-product").getMetadata());
        await assertFails(storage.ref("images/inactive-product").getMetadata());
    });

    it("denies non-owner writes to owned product paths", async () => {
        const storage = otherStorage();

        await assertFails(putObject(storage, "images/owned-product", "image/png"));
        await assertFails(putObject(storage, "documents/owned-product/file1", "application/pdf"));
        await assertFails(putObject(storage, "audio/owned-product/song1", "audio/mpeg"));
        await assertFails(storage.ref("animal_tag/owned-product/pet.png").delete());
    });

    it("denies invalid content types, oversized files and unknown paths", async () => {
        const storage = ownerStorage();

        await assertFails(putObject(storage, "documents/owned-product/file1", "text/plain"));
        await assertFails(putObject(storage, "audio/owned-product/song1", "video/mp4"));
        await assertFails(putObject(storage, "images/owned-product", "image/png", 5 * 1024 * 1024 + 1));
        await assertFails(putObject(storage, "documents/owned-product/not-a-slot", "application/pdf"));
        await assertFails(putObject(storage, "unknown/owned-product/file.png", "image/png"));
    });

    it("preserves legacy public reads while denying new uploads writes", async () => {
        const publicClient = publicStorage();
        const owner = ownerStorage();

        await assertSucceeds(publicClient.ref("uploads/public-product/legacy.pdf").getMetadata());
        await assertSucceeds(publicClient.ref("baby_journal/public-product/old-file.pdf").getMetadata());
        await assertFails(publicClient.ref("uploads/inactive-product/legacy.pdf").getMetadata());
        await assertFails(putObject(owner, "uploads/owned-product/new.pdf", "application/pdf"));
    });

    it("keeps listing restricted to admins", async () => {
        await assertSucceeds(adminStorage().ref("images").listAll());
        await assertFails(ownerStorage().ref("images").listAll());
        await assertFails(publicStorage().ref("images").listAll());
    });
});

async function seedBaseData() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await Promise.all([
            setDoc(doc(db, "users", "owner"), {country: "Sweden", products: ["owned-product", "inactive-owned-product"]}),
            setDoc(doc(db, "users", "other"), {country: "France", products: []}),
            setDoc(doc(db, "products", "owned-product"), product({activated: true, inactive: false})),
            setDoc(doc(db, "products", "inactive-owned-product"), product({activated: true, inactive: true})),
            setDoc(doc(db, "products", "public-product"), product({activated: true, inactive: false})),
            setDoc(doc(db, "products", "legacy-public-product"), productWithoutInactive()),
            setDoc(doc(db, "products", "inactive-product"), product({activated: true, inactive: true})),
            setDoc(doc(db, "products", "admin-product"), product({activated: false, inactive: false})),
        ]);
    });
}

async function seedStorageObjects() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const storage = context.storage();
        await Promise.all([
            putObject(storage, "images/public-product", "image/png"),
            putObject(storage, "images/logo-public-product", "image/png"),
            putObject(storage, "images/legacy-public-product", "image/png"),
            putObject(storage, "images/inactive-product", "image/png"),
            putObject(storage, "animal_tag/owned-product/pet.png", "image/png"),
            putObject(storage, "uploads/public-product/legacy.pdf", "application/pdf"),
            putObject(storage, "uploads/inactive-product/legacy.pdf", "application/pdf"),
            putObject(storage, "baby_journal/public-product/old-file.pdf", "application/pdf"),
        ]);
    });
}

function publicStorage() {
    return testEnv.unauthenticatedContext().storage();
}

function ownerStorage() {
    return testEnv.authenticatedContext("owner").storage();
}

function otherStorage() {
    return testEnv.authenticatedContext("other").storage();
}

function adminStorage() {
    return testEnv.authenticatedContext("admin", {admin: true}).storage();
}

function putObject(storage: firebase.storage.Storage, storagePath: string, contentType: string, size = 3): Promise<firebase.storage.UploadTaskSnapshot> {
    return Promise.resolve(storage.ref(storagePath).put(bytes(size), {contentType}));
}

function bytes(size: number) {
    const data = new Uint8Array(size);
    data[0] = 1;
    return data;
}

function product(overrides: Record<string, unknown> = {}) {
    return {
        name: "FlexPayz product",
        activated: true,
        inactive: false,
        preview: "business_card",
        unlockCode: "ABC123",
        sharedContacts: [],
        previewLanguage: "english",
        ...overrides,
    };
}

function productWithoutInactive() {
    return {
        name: "Legacy FlexPayz product",
        activated: true,
        preview: "business_card",
        unlockCode: "LEGACY",
        sharedContacts: [],
        previewLanguage: "english",
    };
}
