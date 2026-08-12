import * as fs from "fs";
import * as path from "path";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

const describeRules = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
const PROJECT_ID = "demo-flexpayz-rules";

let testEnv: RulesTestEnvironment;

describeRules("Firestore security rules", () => {
    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8"),
                host: "127.0.0.1",
                port: 8080,
            },
        });
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
        await seedBaseData();
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    it("allows admins to manage every collection", async () => {
        const db = adminDb();

        await assertSucceeds(setDoc(doc(db, "products", "admin-product"), product({activated: false, unlockCode: "ADMIN1"})));
        await assertSucceeds(setDoc(doc(db, "permissions", "admin-product"), permissions()));
        await assertSucceeds(setDoc(doc(db, "serial_numbers", "ADMIN-SERIAL"), serial("admin-product")));
        await assertSucceeds(setDoc(doc(db, "users", "admin-user"), {country: "Sweden", products: []}));
        await assertSucceeds(setDoc(doc(db, "baby_journals", "admin-product"), {name: "Baby"}));
        await assertSucceeds(setDoc(doc(db, "adult_journals", "admin-product"), {name: "Adult"}));
        await assertSucceeds(setDoc(doc(db, "animal_tag", "admin-product"), animalTag()));
        await assertSucceeds(addDoc(collection(db, "mail"), mail("public-product", "owner@example.com")));
    });

    it("authorizes only the system-admin role for admin-only collection access", async () => {
        await assertSucceeds(getDocs(collection(adminDb(), "products")));
        await assertSucceeds(getDocs(collection(adminWithOldClaimDb(), "products")));
        await assertFails(getDocs(collection(oldAdminOnlyDb(), "products")));
        await assertFails(getDocs(collection(authedDb("regular"), "products")));
        await assertFails(getDocs(collection(publicDb(), "products")));
    });

    it("keeps user profiles scoped to the signed-in uid", async () => {
        const owner = authedDb("owner");
        const other = authedDb("other");

        await assertSucceeds(getDoc(doc(owner, "users", "owner")));
        await assertSucceeds(updateDoc(doc(owner, "users", "owner"), {products: arrayUnion("new-product")}));
        await assertFails(getDoc(doc(other, "users", "owner")));
        await assertFails(setDoc(doc(owner, "users", "owner"), {country: "Sweden", products: [], role: "admin"}));
    });

    it("allows public product document reads by direct id while still denying collection listing", async () => {
        const db = publicDb();

        await assertSucceeds(getDoc(doc(db, "products", "public-product")));
        await assertSucceeds(getDoc(doc(db, "products", "legacy-public-product")));
        await assertSucceeds(getDoc(doc(db, "products", "inactive-product")));
        await assertSucceeds(getDoc(doc(db, "products", "unactivated-product")));
        await assertFails(getDocs(query(collection(db, "products"), limit(1))));
    });

    it("allows owners to update safe product fields only", async () => {
        const owner = authedDb("owner");
        const other = authedDb("other");

        await assertSucceeds(getDoc(doc(owner, "products", "owned-product")));
        await assertSucceeds(updateDoc(doc(owner, "products", "owned-product"), {name: "Updated", previewLanguage: "french"}));
        await assertFails(updateDoc(doc(owner, "products", "owned-product"), {unlockCode: "NEWCODE"}));
        await assertFails(updateDoc(doc(owner, "products", "owned-product"), {processed: true}));
        await assertFails(updateDoc(doc(owner, "products", "owned-product"), {preview: "bad-preview"}));
        await assertFails(updateDoc(doc(other, "products", "owned-product"), {name: "Stolen"}));
    });

    it("supports bounded signed-in activation lookup and activation-only update", async () => {
        const user = authedDb("new-owner");

        await assertSucceeds(getDocs(query(collection(user, "products"), where("unlockCode", "==", "LOCKED"), limit(1))));
        await assertFails(getDocs(query(collection(user, "products"), where("unlockCode", "==", "LOCKED"))));
        await assertSucceeds(updateDoc(doc(user, "products", "unactivated-product"), {activated: true}));
        await assertFails(updateDoc(doc(user, "products", "unactivated-product"), {activated: true, name: "Claimed"}));
    });

    it("allows public shared contact appends but rejects malformed public writes", async () => {
        const db = publicDb();
        const productRef = doc(db, "products", "public-product");

        await assertSucceeds(updateDoc(productRef, {
            sharedContacts: arrayUnion({
                name: "Visitor",
                email: "visitor@example.com",
                phone: "",
                date: Date.now(),
                consentAccepted: true,
            }),
        }));
        await assertFails(updateDoc(productRef, {name: "Public overwrite"}));
        await assertFails(updateDoc(productRef, {sharedContacts: arrayUnion({email: 42})}));
    });

    it("keeps permissions write access admin-only while owners can read their product permissions", async () => {
        const owner = authedDb("owner");
        const other = authedDb("other");

        await assertSucceeds(getDoc(doc(owner, "permissions", "owned-product")));
        await assertFails(getDoc(doc(other, "permissions", "owned-product")));
        await assertFails(updateDoc(doc(owner, "permissions", "owned-product"), {animal_tag: false}));
        await assertFails(setDoc(doc(adminDb(), "permissions", "owned-product"), {...permissions(), animal_tag: "yes"}));
    });

    it("allows public serial get but keeps serial listing and writes admin-only", async () => {
        const publicClient = publicDb();
        const owner = authedDb("owner");
        const admin = adminDb();

        await assertSucceeds(getDoc(doc(publicClient, "serial_numbers", "SERIAL-1")));
        await assertFails(getDocs(collection(owner, "serial_numbers")));
        await assertFails(updateDoc(doc(owner, "serial_numbers", "SERIAL-1"), {productID: "other"}));
        await assertSucceeds(getDocs(collection(admin, "serial_numbers")));
    });

    it("applies product ownership and public-active access to journal and animal-tag docs", async () => {
        const owner = authedDb("owner");
        const other = authedDb("other");
        const publicClient = publicDb();

        await assertSucceeds(getDoc(doc(publicClient, "baby_journals", "public-product")));
        await assertSucceeds(getDoc(doc(publicClient, "adult_journals", "public-product")));
        await assertSucceeds(getDoc(doc(publicClient, "animal_tag", "public-product")));
        await assertFails(getDoc(doc(publicClient, "baby_journals", "inactive-product")));
        await assertSucceeds(updateDoc(doc(owner, "baby_journals", "owned-product"), {name: "Updated"}));
        await assertSucceeds(updateDoc(doc(owner, "adult_journals", "owned-product"), {name: "Updated"}));
        await assertSucceeds(updateDoc(doc(owner, "animal_tag", "owned-product"), {gender: "female"}));
        await assertFails(updateDoc(doc(other, "baby_journals", "owned-product"), {name: "No"}));
        await assertFails(updateDoc(doc(owner, "animal_tag", "owned-product"), {gender: "unknown"}));
    });

    it("allows public mail enqueue only for matching lost animal-tag contact", async () => {
        const publicClient = publicDb();
        const admin = adminDb();

        await assertSucceeds(addDoc(collection(publicClient, "mail"), mail("public-product", "owner@example.com")));
        await assertFails(addDoc(collection(publicClient, "mail"), mail("public-product", "wrong@example.com")));
        await assertFails(addDoc(collection(publicClient, "mail"), mail("owned-product", "owner@example.com")));
        await assertSucceeds(getDocs(collection(admin, "mail")));
        await assertFails(getDocs(collection(publicClient, "mail")));
    });
});

async function seedBaseData() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await Promise.all([
            setDoc(doc(db, "users", "owner"), {country: "Sweden", products: ["owned-product"]}),
            setDoc(doc(db, "users", "other"), {country: "France", products: []}),
            setDoc(doc(db, "products", "owned-product"), product({activated: true, inactive: false, unlockCode: "OWNED"})),
            setDoc(doc(db, "products", "public-product"), product({activated: true, inactive: false, unlockCode: "PUBLIC", preview: "animal_tag"})),
            setDoc(doc(db, "products", "legacy-public-product"), legacyProduct({inactive: false, unlockCode: "LEGACY"})),
            setDoc(doc(db, "products", "inactive-product"), product({activated: true, inactive: true, unlockCode: "INACTIVE"})),
            setDoc(doc(db, "products", "unactivated-product"), product({activated: false, inactive: false, unlockCode: "LOCKED"})),
            setDoc(doc(db, "permissions", "owned-product"), permissions()),
            setDoc(doc(db, "serial_numbers", "SERIAL-1"), serial("public-product")),
            setDoc(doc(db, "baby_journals", "owned-product"), {name: "Owned baby"}),
            setDoc(doc(db, "adult_journals", "owned-product"), {name: "Owned adult"}),
            setDoc(doc(db, "animal_tag", "owned-product"), animalTag()),
            setDoc(doc(db, "baby_journals", "public-product"), {name: "Public baby"}),
            setDoc(doc(db, "baby_journals", "inactive-product"), {name: "Inactive baby"}),
            setDoc(doc(db, "adult_journals", "public-product"), {name: "Public adult"}),
            setDoc(doc(db, "animal_tag", "public-product"), animalTag({isLost: true, contact: {name: "Owner", phone: "123", email: "owner@example.com", address: "Street"}})),
        ]);
    });
}

function publicDb() {
    return testEnv.unauthenticatedContext().firestore();
}

function authedDb(uid: string, claims: Record<string, unknown> = {}) {
    return testEnv.authenticatedContext(uid, claims).firestore();
}

function adminDb() {
    return authedDb("admin", {role: "system-admin"});
}

function adminWithOldClaimDb() {
    return authedDb("admin", {role: "system-admin", admin: true});
}

function oldAdminOnlyDb() {
    return authedDb("admin", {admin: true});
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

function legacyProduct(overrides: Record<string, unknown> = {}) {
    const data: Record<string, unknown> = product(overrides);
    delete data.activated;
    return data;
}

function permissions() {
    return {
        business_card: true,
        custom_link: true,
        upload_files: true,
        upload_video: true,
        upload_songs: true,
        baby_journal: true,
        adult_journal: true,
        animal_tag: true,
    };
}

function serial(productID: string) {
    return {
        productID,
        type: "default",
        createdAt: new Date(),
    };
}

function animalTag(overrides: Record<string, unknown> = {}) {
    return {
        photo: [],
        name: "Milo",
        breed: "Mixed",
        age: "4",
        weight: "12 kg",
        color: "Brown",
        gender: "male",
        height: "40 cm",
        ownerMessage: "Call me",
        contact: {
            name: "Owner",
            phone: "123",
            email: "owner@example.com",
            address: "Street",
        },
        isLost: false,
        ...overrides,
    };
}

function mail(productId: string, to: string) {
    return {
        productId,
        to,
        message: {
            subject: "Milo was found",
            text: "Location: https://maps.google.com/?q=1,2",
        },
    };
}
