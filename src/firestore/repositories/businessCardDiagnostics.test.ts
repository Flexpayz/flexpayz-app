import {getDocFromServer} from "firebase/firestore";
import {getBusinessCardProductDiagnostics, getBusinessCardOwnershipDiagnostics} from "./businessCardDiagnostics";

jest.mock("../../firebase", () => ({db: {}}));
jest.mock("firebase/firestore", () => ({
    doc: jest.fn((_db, ...path) => ({path: path.join("/")})),
    getDocFromServer: jest.fn(),
}));

test.each([
    [false, undefined, false, false],
    [true, "card-id", false, false],
    [true, ["other-id"], true, false],
    [true, ["card-id"], true, true],
])("checks raw rule ownership with exists=%s and products=%s", async (exists, products, productsIsList, productListedForUser) => {
    (getDocFromServer as jest.Mock).mockResolvedValue({exists: () => exists, data: () => ({products})});
    expect(await getBusinessCardOwnershipDiagnostics("uid", "card-id")).toEqual({
        userDocumentExists: exists, productsIsList, productListedForUser,
    });
    expect(getDocFromServer).toHaveBeenCalledWith({path: "users/uid"});
});

test("propagates denied reads instead of reporting no ownership", async () => {
    const error = {code: "permission-denied"};
    (getDocFromServer as jest.Mock).mockRejectedValue(error);
    await expect(getBusinessCardOwnershipDiagnostics("uid", "card-id")).rejects.toBe(error);
});


test("exposes legacy field types and resulting lengths without including field values", async () => {
    (getDocFromServer as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({firstName: "private-old-name", activated: null, legacyField: "private-legacy-value", email: "private@example.com"}),
    });
    const result = await getBusinessCardProductDiagnostics("card", {firstName: "x".repeat(161), email: "private@example.com"});
    expect(result.changedFields).toEqual(["firstName"]);
    expect(result.resultingDocumentFields).toEqual(expect.arrayContaining([
        {field: "firstName", type: "string", length: 161},
        {field: "activated", type: "null"},
        {field: "legacyField", type: "string", length: 20},
    ]));
    expect(JSON.stringify(result)).not.toContain("private");
    expect(getDocFromServer).toHaveBeenCalledWith({path: "products/card"});
});
