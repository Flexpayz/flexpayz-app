import {getBusinessCardProductDiagnostics, getBusinessCardOwnershipDiagnostics} from "./firestore/repositories/businessCardDiagnostics";
import {createBusinessCardSaveTrace} from "./business-card-save-diagnostics";

jest.mock("./firebase", () => ({
    firebaseApp: {options: {projectId: "test-project", storageBucket: "test-bucket"}},
}));
jest.mock("firebase/auth", () => ({getAuth: () => ({currentUser: {
    uid: "diagnostic-user-id",
    getIdTokenResult: async () => ({
        token: "private-token",
        claims: {sub: "diagnostic-user-id", aud: "test-project", iss: "https://securetoken.google.com/test-project", email: "private-email"},
        expirationTime: "2026-10-20T00:00:00Z",
    }),
}})}));
jest.mock("./firestore/repositories/businessCardDiagnostics", () => ({
    getBusinessCardOwnershipDiagnostics: jest.fn(),
    getBusinessCardProductDiagnostics: jest.fn(),
}));

let info: jest.SpyInstance;
let errorLog: jest.SpyInstance;
beforeEach(() => {
    (getBusinessCardOwnershipDiagnostics as jest.Mock).mockResolvedValue({
        userDocumentExists: true, productsIsList: true, productListedForUser: false,
    });
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test("identifies a Storage failure after the fields were saved without logging private data", async () => {
    const trace = createBusinessCardSaveTrace("manual", "private-product-id");
    await trace.run("firestore-update", async () => "private-card-content");
    const failure = Object.assign(new Error("private-download-url"), {code: "storage/unauthorized"});
    await expect(trace.run("vcard-upload", async () => {throw failure;})).rejects.toBe(failure);
    expect(errorLog).toHaveBeenCalledWith("[BusinessCardSave] failed", expect.objectContaining({
        mode: "manual", stage: "vcard-upload", fieldsPersisted: true,
        code: "storage/unauthorized", projectId: "test-project", signedIn: true,
    }));
    const logs = JSON.stringify([...info.mock.calls, ...errorLog.mock.calls]);
    expect(logs).not.toContain("private-");
    expect(info.mock.calls[0][1].attemptId).toBe(errorLog.mock.calls[0][1].attemptId);
});

test("reports an unsuccessful autosave without claiming the fields were saved", async () => {
    const failure = {code: "permission-denied"};
    const trace = createBusinessCardSaveTrace("autosave", "id");
    await expect(trace.run("firestore-update", () => {throw failure;})).rejects.toBe(failure);
    expect(errorLog).toHaveBeenCalledWith("[BusinessCardSave] failed", expect.objectContaining({
        mode: "autosave", stage: "firestore-update", fieldsPersisted: false, code: "permission-denied",
    }));
});

test("does not log arbitrary thrown values or unsafe error codes", async () => {
    const trace = createBusinessCardSaveTrace("manual", "id");
    await expect(trace.run("vcard-build", () => {throw {code: "private@example.com"};})).rejects.toEqual({code: "private@example.com"});
    expect(errorLog.mock.calls[0][1].code).toBe("unknown");
});


test("diagnoses token alignment and missing product ownership after a denial", async () => {
    const trace = createBusinessCardSaveTrace("manual", "card-id");
    await expect(trace.run("firestore-update", () => {throw {code: "permission-denied"};})).rejects.toBeDefined();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(getBusinessCardOwnershipDiagnostics).toHaveBeenCalledWith("diagnostic-user-id", "card-id");
    expect(info).toHaveBeenCalledWith("[BusinessCardSave] auth-checks", expect.objectContaining({
        tokenSubjectMatchesUser: true, tokenProjectMatchesApp: true, tokenIssuerMatchesApp: true, isSystemAdmin: false,
    }));
    expect(info).toHaveBeenCalledWith("[BusinessCardSave] ownership-checks", expect.objectContaining({
        ownsProductAccordingToLocalRule: false, productPath: "products/card-id", userPath: "users/diagnostic-user-id",
    }));
    expect(JSON.stringify(info.mock.calls)).not.toContain("private-");
});

test("keeps the original save failure when the diagnostic read is denied", async () => {
    (getBusinessCardOwnershipDiagnostics as jest.Mock).mockRejectedValue({code: "permission-denied"});
    const failure = {code: "permission-denied"};
    await expect(createBusinessCardSaveTrace("manual", "id").run("firestore-update", () => {throw failure;})).rejects.toBe(failure);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(console.warn).toHaveBeenCalledWith("[BusinessCardSave] ownership-checks unavailable", expect.objectContaining({code: "permission-denied"}));
    expect(info.mock.calls.some(([label]) => label === "[BusinessCardSave] ownership-checks")).toBe(false);
});


test("passes the attempted payload to product diagnostics after a denied write", async () => {
    (getBusinessCardProductDiagnostics as jest.Mock).mockResolvedValue({productDocumentExists: true, changedFields: ["firstName"]});
    const payload = {firstName: "private-card-value"};
    await expect(createBusinessCardSaveTrace("manual", "card", payload).run("firestore-update", () => {
        throw {code: "permission-denied"};
    })).rejects.toBeDefined();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(getBusinessCardProductDiagnostics).toHaveBeenCalledWith("card", payload);
    expect(info).toHaveBeenCalledWith("[BusinessCardSave] product-shape-checks", expect.objectContaining({changedFields: ["firstName"]}));
    expect(JSON.stringify(info.mock.calls)).not.toContain("private-");
});
