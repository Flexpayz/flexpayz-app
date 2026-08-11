import {defaultPermissions} from "../../firestore/schema/permissions";
import {normalizeProduct, ProductFirestoreData} from "../../firestore/schema/products";
import {Preview} from "../../preview";
import {normalizeAdminProductDocument} from "./adminProductModel";

function normalize(raw: ProductFirestoreData, related = {}) {
    return normalizeAdminProductDocument("product-1", raw, normalizeProduct(raw), related);
}

describe("admin product legacy adapter", () => {
    it("treats minimal inactive legacy products as available and ignores processed", () => {
        const product = normalize({
            activated: false,
            unlockCode: "ABC123",
            preview: Preview.BUSINESS_CARD,
            processed: true,
        });

        expect(product.displayStatus).toBe("available");
        expect(product.ownershipState).toBe("available");
        expect(product.createdAt).toBeNull();
        expect(product.updatedAt).toBeNull();
        expect(product.dataHealth).not.toEqual(expect.arrayContaining([
            expect.objectContaining({code: "unsupported-legacy-data"}),
        ]));
    });

    it("defaults missing administrative status to active and resolves legacy owners from page data", () => {
        const product = normalize(
            {
                activated: true,
                unlockCode: "ABC123",
                preview: Preview.BUSINESS_CARD,
            },
            {
                legacyOwner: {
                    uid: "user-1",
                    displayName: "Owner",
                    email: "owner@example.com",
                    productListContainsProduct: true,
                },
                permissions: defaultPermissions,
                permissionsDocumentExists: true,
            },
        );

        expect(product.administrativeStatus).toBe("active");
        expect(product.displayStatus).toBe("active");
        expect(product.ownership.ownerId).toBe("user-1");
        expect(product.owner?.email).toBe("owner@example.com");
        expect(product.productType).toBe("Business card");
        expect(product.dataHealth).toEqual([]);
    });

    it("marks activated legacy products with no resolvable owner as data issues", () => {
        const product = normalize({
            activated: true,
            unlockCode: "ABC123",
            preview: Preview.CUSTOM_LINK,
        });

        expect(product.ownershipState).toBe("legacy-unresolved");
        expect(product.displayStatus).toBe("legacy-data-issue");
        expect(product.dataHealth).toEqual(expect.arrayContaining([
            expect.objectContaining({code: "unresolved-owner", severity: "critical"}),
            expect.objectContaining({code: "missing-permissions", severity: "warning"}),
        ]));
    });

    it("normalizes explicit visible sections before legacy preview values", () => {
        const product = normalize(
            {
                activated: false,
                unlockCode: "ABC123",
                preview: Preview.BUSINESS_CARD,
                visibleSections: ["upload_songs", "baby_journal"],
            },
            {permissions: defaultPermissions, permissionsDocumentExists: true},
        );

        expect(product.selectedContent).toEqual([Preview.UPLOAD_SONGS, Preview.BABY_JOURNAL]);
        expect(product.displayStatus).toBe("available");
    });

    it("detects multiple serial conflicts", () => {
        const product = normalize(
            {
                activated: true,
                unlockCode: "ABC123",
                preview: Preview.BUSINESS_CARD,
                ownerId: "user-1",
                serialNumber: "SERIAL-A",
            },
            {
                owner: {
                    uid: "user-1",
                    displayName: "Owner",
                    email: "",
                    productListContainsProduct: true,
                },
                permissions: defaultPermissions,
                permissionsDocumentExists: true,
                serials: [
                    {serialNumber: "SERIAL-B", productID: "product-1", type: "default"},
                    {serialNumber: "SERIAL-C", productID: "product-1", type: "default"},
                ],
            },
        );

        expect(product.serialState).toBe("conflict");
        expect(product.displayStatus).toBe("legacy-data-issue");
        expect(product.dataHealth).toEqual(expect.arrayContaining([
            expect.objectContaining({code: "multiple-serials", severity: "critical"}),
        ]));
    });

    it("accepts one serial mapping as assigned", () => {
        const product = normalize(
            {
                activated: false,
                unlockCode: "ABC123",
                preview: Preview.BUSINESS_CARD,
                serialNumber: "SERIAL-A",
            },
            {
                permissions: defaultPermissions,
                permissionsDocumentExists: true,
                serials: [
                    {serialNumber: "SERIAL-A", productID: "product-1", type: "default"},
                ],
            },
        );

        expect(product.serialState).toBe("assigned");
        expect(product.dataHealth).not.toEqual(expect.arrayContaining([
            expect.objectContaining({code: "multiple-serials"}),
            expect.objectContaining({code: "serial-mismatch"}),
        ]));
    });


    it("places suspended and archived products ahead of ownership status", () => {
        const suspended = normalize({
            activated: true,
            unlockCode: "ABC123",
            preview: Preview.BUSINESS_CARD,
            administrativeStatus: "suspended",
        });
        const archived = normalize({
            activated: false,
            unlockCode: "ABC123",
            preview: Preview.BUSINESS_CARD,
            administrativeStatus: "archived",
        });

        expect(suspended.displayStatus).toBe("suspended");
        expect(archived.displayStatus).toBe("archived");
    });
});
