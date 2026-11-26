import {arrayUnion, doc, serverTimestamp, setDoc, updateDoc} from "firebase/firestore";
import {Preview} from "../../preview";
import {updateProduct} from "./products";
import {addProductToUser, createUserProfile} from "./users";
import {setSerialNumberInBatch} from "./serialNumbers";

jest.mock("../../firebase", () => ({db: {app: "test"}}));

jest.mock("firebase/firestore", () => ({
    addDoc: jest.fn(),
    arrayUnion: jest.fn((value) => ({arrayUnion: value})),
    collection: jest.fn((_db, path) => ({path})),
    doc: jest.fn((_db, ...path) => ({path: path.join("/")})),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn((value) => ({limit: value})),
    query: jest.fn(),
    serverTimestamp: jest.fn(() => ({serverTimestamp: true})),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    where: jest.fn(),
    writeBatch: jest.fn(),
}));

const mockedDoc = doc as jest.MockedFunction<typeof doc>;
const mockedSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockedUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockedArrayUnion = arrayUnion as jest.MockedFunction<typeof arrayUnion>;
const mockedServerTimestamp = serverTimestamp as jest.MockedFunction<typeof serverTimestamp>;

beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockImplementation((_db, ...path) => ({path: path.join("/")}) as never);
    mockedArrayUnion.mockImplementation((value) => ({arrayUnion: value}) as never);
    mockedServerTimestamp.mockImplementation(() => ({serverTimestamp: true}) as never);
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
});

describe("Firestore repositories", () => {
    it("serializes product updates without undefined fields", async () => {
        await updateProduct("product-1", {
            name: "Office Ring",
            category: undefined,
        });

        expect(mockedUpdateDoc).toHaveBeenCalledWith({path: "products/product-1"}, {name: "Office Ring"});
    });

    it("creates user profiles and appends products through arrayUnion", async () => {
        await createUserProfile("user-1", {country: "Sweden", products: []});
        await addProductToUser("user-1", "product-1");

        expect(mockedSetDoc).toHaveBeenCalledWith({path: "users/user-1"}, {country: "Sweden", products: []});
        expect(mockedArrayUnion).toHaveBeenCalledWith("product-1");
        expect(mockedUpdateDoc).toHaveBeenCalledWith({path: "users/user-1"}, {products: {arrayUnion: "product-1"}});
    });

    it("writes serial numbers in batches with server timestamps", () => {
        const batch = {set: jest.fn()};

        setSerialNumberInBatch(batch as never, "SERIAL-1", {
            productID: "product-1",
            type: "default",
            redirectUrl: undefined,
        });

        expect(mockedServerTimestamp).toHaveBeenCalled();
        expect(batch.set).toHaveBeenCalledWith(
            {path: "serial_numbers/SERIAL-1"},
            {productID: "product-1", type: "default", createdAt: {serverTimestamp: true}},
        );
    });

    it("uses centralized product paths for product document updates", async () => {
        await updateProduct("product-2", {
            preview: Preview.BUSINESS_CARD,
            visibleSections: [Preview.BUSINESS_CARD],
        });

        expect(mockedDoc).toHaveBeenCalledWith({app: "test"}, "products", "product-2");
        expect(mockedUpdateDoc).toHaveBeenCalledWith(
            {path: "products/product-2"},
            {preview: Preview.BUSINESS_CARD, visibleSections: [Preview.BUSINESS_CARD]},
        );
    });
});
