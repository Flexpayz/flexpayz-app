import {
    PDF_MAX_SIZE_BYTES,
    UPLOAD_FILE_SLOTS,
    buildUploadFileNameUpdate,
    formatFileSize,
    getReadyUploadFileDocuments,
    getSafePdfDownloadName,
    validateDisplayName,
    validatePdfFile,
} from "./upload-files";
import {Preview} from "./preview";

const product: any = {
    filename1: "Product Catalogue",
    filename2: "Price List.pdf",
    filename3: "",
    visibleSections: [Preview.BUSINESS_CARD, Preview.UPLOAD_FILE],
    publicPagePassword: "secret",
    customLink: "https://example.com",
};

function pdfFile(name = "document.pdf", sizeContent = "%PDF-1.7\ncontent", type = "application/pdf") {
    return new File([sizeContent], name, {type});
}

describe("Upload Files helpers", () => {
    it("validates PDF files by extension, MIME, size and signature", async () => {
        await expect(validatePdfFile(pdfFile())).resolves.toBeNull();
        await expect(validatePdfFile(pdfFile("document.txt"))).resolves.toBe("Only PDF documents are supported.");
        await expect(validatePdfFile(pdfFile("document.pdf", "%PDF-1.7", "text/plain"))).resolves.toBe("The selected file does not look like a PDF.");
        await expect(validatePdfFile(new File([], "empty.pdf", {type: "application/pdf"}))).resolves.toBe("Choose a PDF that is not empty.");
        await expect(validatePdfFile(pdfFile("fake.pdf", "not-a-pdf"))).resolves.toBe("The selected file is not a valid PDF document.");
    });

    it("rejects oversized PDF files before upload", async () => {
        const oversizedFile = new File([new Uint8Array(PDF_MAX_SIZE_BYTES + 1)], "large.pdf", {type: "application/pdf"});

        await expect(validatePdfFile(oversizedFile)).resolves.toBe("PDF must be 10 MB or smaller.");
    });

    it("validates public display names without requiring a .pdf extension", () => {
        expect(validateDisplayName("Product Catalogue")).toBeNull();
        expect(validateDisplayName("Product Catalogue.pdf")).toBeNull();
        expect(validateDisplayName("   ")).toBe("Enter a display name before publishing this document.");
    });

    it("builds targeted Firestore updates for filename fields only", () => {
        const update = buildUploadFileNameUpdate({
            filename1: " Product Catalogue 2026 ",
            filename2: "Price List.pdf",
            filename3: "",
        }, product);

        expect(update).toEqual({filename1: "Product Catalogue 2026"});
        expect(update).not.toHaveProperty("visibleSections");
        expect(update).not.toHaveProperty("publicPagePassword");
        expect(update).not.toHaveProperty("customLink");
    });

    it("publishes only slots with a display name and available Storage object", () => {
        const documents = getReadyUploadFileDocuments(product, "product-1", {
            file1: {exists: true, metadata: {name: "file1", size: 2400000, contentType: "application/pdf", customMetadata: {originalName: "Product-Catalogue.pdf"}} as any},
            file2: {exists: false, error: "missing"},
            file3: {exists: true, metadata: {name: "file3", size: 1100000, contentType: "application/pdf"} as any},
        });

        expect(documents).toHaveLength(1);
        expect(documents[0]).toMatchObject({
            displayName: "Product Catalogue",
            originalName: "Product-Catalogue.pdf",
            storagePath: "documents/product-1/file1",
        });
    });

    it("keeps fixed slot order for public documents", () => {
        const documents = getReadyUploadFileDocuments({
            filename1: "One",
            filename2: "Two",
            filename3: "Three",
        } as any, "product-1", {
            file1: {exists: true, metadata: {name: "file1", size: 1} as any},
            file2: {exists: true, metadata: {name: "file2", size: 1} as any},
            file3: {exists: true, metadata: {name: "file3", size: 1} as any},
        });

        expect(documents.map((document) => document.slot.id)).toEqual(UPLOAD_FILE_SLOTS.map((slot) => slot.id));
    });

    it("adds .pdf to download names only when missing", () => {
        expect(getSafePdfDownloadName("Catalogue")).toBe("Catalogue.pdf");
        expect(getSafePdfDownloadName("Catalogue.pdf")).toBe("Catalogue.pdf");
    });

    it("formats file sizes for the editor and public pages", () => {
        expect(formatFileSize(2400000)).toBe("2.3 MB");
        expect(formatFileSize(0)).toBe("PDF");
    });
});
