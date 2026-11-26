import {
    collection,
    doc,
    documentId,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    where,
} from "firebase/firestore";
import {Preview} from "../../preview";
import {listAdminProducts} from "./adminProducts";

jest.mock("../../firebase", () => ({db: {app: "test"}}));

jest.mock("firebase/firestore", () => ({
    collection: jest.fn((_db, path) => ({path})),
    doc: jest.fn((_db, ...path) => ({path: path.join("/")})),
    documentId: jest.fn(() => "__name__"),
    getCountFromServer: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn((value) => ({type: "limit", value})),
    orderBy: jest.fn((field) => ({type: "orderBy", field})),
    query: jest.fn((collectionRef, ...constraints) => ({collectionRef, constraints})),
    startAfter: jest.fn((value) => ({type: "startAfter", value})),
    where: jest.fn((field, op, value) => ({type: "where", field, op, value})),
}));

const mockedCollection = collection as jest.MockedFunction<typeof collection>;
const mockedDoc = doc as jest.MockedFunction<typeof doc>;
const mockedGetCountFromServer = getCountFromServer as jest.MockedFunction<typeof getCountFromServer>;
const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockedGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockedLimit = limit as jest.MockedFunction<typeof limit>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedStartAfter = startAfter as jest.MockedFunction<typeof startAfter>;

function productDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => ({
            name: id,
            activated: false,
            preview: Preview.BUSINESS_CARD,
            unlockCode: "ABC123",
            administrativeStatus: "active",
            ...data,
        }),
    };
}

function querySnapshot(docs: unknown[]) {
    return {docs};
}

function emptyDoc() {
    return {
        exists: () => false,
        data: () => null,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockedCollection.mockImplementation((_db: unknown, path: string) => ({path}) as never);
    mockedDoc.mockImplementation((_db: unknown, ...path: string[]) => ({path: path.join("/")}) as never);
    (documentId as jest.MockedFunction<typeof documentId>).mockReturnValue("__name__" as never);
    (orderBy as jest.MockedFunction<typeof orderBy>).mockImplementation((field: unknown) => ({type: "orderBy", field}) as never);
    mockedLimit.mockImplementation((value: number) => ({type: "limit", value}) as never);
    mockedQuery.mockImplementation((collectionRef: unknown, ...constraints: unknown[]) => ({collectionRef, constraints}) as never);
    mockedStartAfter.mockImplementation((value: unknown) => ({type: "startAfter", value}) as never);
    (where as jest.MockedFunction<typeof where>).mockImplementation((field: unknown, op: unknown, value: unknown) => ({type: "where", field, op, value}) as never);
    mockedGetCountFromServer.mockResolvedValue({data: () => ({count: 42})} as never);
    mockedGetDoc.mockResolvedValue(emptyDoc() as never);
    mockedGetDocs.mockImplementation(async (request: any) => {
        if (request.collectionRef.path === "products") {
            return querySnapshot([
                productDoc("p1", {name: "One"}),
                productDoc("p2", {name: "Two"}),
            ]) as never;
        }
        return querySnapshot([]) as never;
    });
});

describe("admin product repository pagination", () => {
    it("counts matching products, limits page reads to 25, and enriches only visible page products", async () => {
        const result = await listAdminProducts({pageSize: 25, page: 1});

        expect(mockedGetCountFromServer).toHaveBeenCalledTimes(1);
        expect(mockedLimit).toHaveBeenCalledWith(25);
        expect(result.totalCount).toBe(42);
        expect(result.totalPages).toBe(2);
        expect(result.products.map((product) => product.id)).toEqual(["p1", "p2"]);
        expect(mockedGetDoc).toHaveBeenCalledWith({path: "permissions/p1"});
        expect(mockedGetDoc).toHaveBeenCalledWith({path: "permissions/p2"});
        expect(mockedGetDoc).not.toHaveBeenCalledWith({path: "permissions/p3"});
    });

    it("uses the supplied cursor for later pages", async () => {
        await listAdminProducts({pageSize: 25, page: 2, cursor: "p25"});

        expect(mockedStartAfter).toHaveBeenCalledWith("p25");
    });

    it("applies access filtering after loading the visible page permissions", async () => {
        mockedGetDoc.mockImplementation(async (ref: any) => {
            if (ref.path === "permissions/p1") {
                return {
                    exists: () => true,
                    data: () => ({
                        business_card: true,
                        custom_link: false,
                        upload_files: false,
                        upload_video: false,
                        upload_songs: false,
                        baby_journal: false,
                        adult_journal: false,
                        animal_tag: false,
                    }),
                } as never;
            }
            if (ref.path === "permissions/p2") {
                return {
                    exists: () => true,
                    data: () => ({
                        business_card: false,
                        custom_link: true,
                        upload_files: false,
                        upload_video: false,
                        upload_songs: false,
                        baby_journal: false,
                        adult_journal: false,
                        animal_tag: false,
                    }),
                } as never;
            }
            return emptyDoc() as never;
        });

        const result = await listAdminProducts({pageSize: 25, page: 1, access: "custom_link"});

        expect(result.products.map((item) => item.id)).toEqual(["p2"]);
    });
});
