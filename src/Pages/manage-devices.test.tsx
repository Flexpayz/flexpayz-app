import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {useState} from "react";
import {getIdTokenResult, onAuthStateChanged, signOut} from "firebase/auth";
import {arrayUnion, collection, doc, getDoc, getDocs, limit, query, updateDoc, where} from "firebase/firestore";
import {ManageDevices} from "./manage-devices";
import {MainContext} from "../contexts";
import {FlexPayzThemeProvider} from "../theme";

jest.mock("firebase/auth", () => ({
    getAuth: jest.fn(() => ({})),
    getIdTokenResult: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    arrayUnion: jest.fn((value) => ({arrayUnion: value})),
    collection: jest.fn((_db, path) => ({path})),
    doc: jest.fn((_db, ...path) => ({path: path.join('/')})),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn((value) => ({limit: value})),
    query: jest.fn((collectionRef, ...constraints) => ({collectionRef, constraints})),
    updateDoc: jest.fn(),
    where: jest.fn((field, op, value) => ({field, op, value})),
}));

jest.mock("../control-state", () => ({
    defaultProduct: {},
}));

const mockedOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;
const mockedGetIdTokenResult = getIdTokenResult as jest.MockedFunction<typeof getIdTokenResult>;
const mockedSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockedArrayUnion = arrayUnion as jest.MockedFunction<typeof arrayUnion>;
const mockedCollection = collection as jest.MockedFunction<typeof collection>;
const mockedDoc = doc as jest.MockedFunction<typeof doc>;
const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockedGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockedLimit = limit as jest.MockedFunction<typeof limit>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockedWhere = where as jest.MockedFunction<typeof where>;

const products = {
    p1: {name: "Midnight Ring", activated: true, unlockCode: "AAAAAA", preview: "business_card", category: "ring"},
    p2: {name: "Studio Card", activated: true, inactive: true, unlockCode: "BBBBBB", preview: "custom_link", category: "card"},
    p3: {name: "Milo’s Tag", activated: true, unlockCode: "CCCCCC", preview: "animal_tag", category: "tag"},
    p4: {name: "New Product", activated: false, unlockCode: "A7C9F2", preview: "business_card", category: "ring"},
};

function docSnap(data: any, exists = true) {
    return {
        exists: () => exists,
        data: () => data,
    };
}

function querySnap(items: Array<{id: string; data: any}>) {
    return {
        forEach: (callback: any) => items.forEach((item) => callback({id: item.id, data: () => item.data})),
    };
}

function renderManageDevices() {
    function TestHarness() {
        const [state, setState] = useState({});

        return (
            <FlexPayzThemeProvider>
                <MainContext.Provider value={{state, setState, db: {}}}>
                    <MemoryRouter initialEntries={["/manage-devices"]}>
                        <Routes>
                            <Route path="/app" element={<h1>Entry page</h1>}/>
                            <Route path="/manage-devices" element={<ManageDevices/>}/>
                            <Route path="/manage-device" element={<h1>Manage device page</h1>}/>
                            <Route path="/admin" element={<h1>Admin dashboard</h1>}/>
                        </Routes>
                    </MemoryRouter>
                </MainContext.Provider>
            </FlexPayzThemeProvider>
        );
    }

    return render(<TestHarness/>);
}

beforeEach(() => {
    jest.resetAllMocks();
    mockedArrayUnion.mockImplementation((value: unknown) => ({arrayUnion: value}) as any);
    mockedCollection.mockImplementation((_db: any, path: string) => ({path}) as any);
    mockedDoc.mockImplementation((_db: any, ...path: string[]) => ({path: path.join('/')}) as any);
    mockedQuery.mockImplementation((collectionRef: any, ...constraints: any[]) => ({collectionRef, constraints}) as any);
    mockedWhere.mockImplementation((field: unknown, op: unknown, value: unknown) => ({field, op, value}) as any);
    mockedOnAuthStateChanged.mockImplementation((_auth, callback: any) => {
        callback({uid: "user-1"});
        return jest.fn();
    });
    mockedGetIdTokenResult.mockResolvedValue({claims: {role: "system-admin"}} as any);
    mockedSignOut.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined as any);
    mockedLimit.mockImplementation((value: number) => ({limit: value}) as any);
    mockedGetDoc.mockImplementation(async (ref: any) => {
        if (ref.path === "users/user-1") return docSnap({products: ["p1", "p2", "p3"]}) as any;
        const productId = ref.path.replace("products/", "");
        if ((products as any)[productId]) return docSnap((products as any)[productId]) as any;
        return docSnap(null, false) as any;
    });
    mockedGetDocs.mockResolvedValue(querySnap([]) as any);
});

describe("ManageDevices dashboard", () => {
    it("renders populated devices, count pluralization, search, and profile icon menu", async () => {
        renderManageDevices();

        expect(screen.getByText("Loading active products")).toBeInTheDocument();
        expect(await screen.findByText("3 active FlexPayz products")).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "My devices"})).toBeInTheDocument();
        expect(await screen.findByText("Midnight Ring")).toBeInTheDocument();
        expect(screen.getByText("Studio Card")).toBeInTheDocument();
        expect(screen.getByText("Milo’s Tag")).toBeInTheDocument();
        expect(screen.getByText("Inactive")).toBeInTheDocument();
        expect(screen.queryByRole("radio", {name: "All"})).not.toBeInTheDocument();
        expect(screen.queryByRole("radio", {name: "Business"})).not.toBeInTheDocument();
        expect(screen.queryByRole("radio", {name: "Personal"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /Open actions for/i})).not.toBeInTheDocument();

        expect(screen.getByRole("button", {name: "Open profile menu"})).toBeInTheDocument();
        expect(await screen.findByRole("button", {name: "Open admin dashboard"})).toBeInTheDocument();
        expect(screen.queryByText("RM")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Open profile menu"}));
        expect(screen.getByRole("menuitem", {name: "Logout"})).toBeInTheDocument();
        fireEvent.keyDown(screen.getByRole("menu"), {key: "Escape"});
        await waitFor(() => expect(screen.queryByRole("menuitem", {name: "Logout"})).not.toBeInTheDocument());

        fireEvent.change(screen.getByLabelText("Search your devices"), {target: {value: "studio"}});
        expect(screen.getByText("Studio Card")).toBeInTheDocument();
        expect(screen.queryByText("Midnight Ring")).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Search your devices"), {target: {value: "missing"}});
        expect(screen.getByText("No matching devices")).toBeInTheDocument();
        expect(screen.getByText("Try another search.")).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole("button", {name: "Clear search"})[1]);
        expect(screen.getByText("Milo’s Tag")).toBeInTheDocument();
    });

    it("renders empty state without search controls", async () => {
        mockedGetDoc.mockImplementation(async (ref: any) => {
            if (ref.path === "users/user-1") return docSnap({products: []}) as any;
            return docSnap(null, false) as any;
        });

        renderManageDevices();

        expect(await screen.findByText("No active products yet")).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Your collection starts here."})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Add your first device"})).toBeInTheDocument();
        expect(screen.queryByLabelText("Search your devices")).not.toBeInTheDocument();
    });

    it("renders fetch error and retries", async () => {
        mockedGetDoc.mockRejectedValueOnce({code: "unavailable"});

        renderManageDevices();

        expect(await screen.findByText("Couldn’t load your devices")).toBeInTheDocument();
        expect(screen.getByText("Network unavailable. Please try again.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Retry"}));
        await waitFor(() => expect(mockedGetDoc).toHaveBeenCalledTimes(5));
    });

    it("navigates to add-device flow and manage-device route", async () => {
        renderManageDevices();

        expect(await screen.findByText("Midnight Ring")).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole("button", {name: "Manage device"})[0]);
        expect(await screen.findByRole("heading", {name: "Manage device page"})).toBeInTheDocument();
    });

    it("shows the admin dashboard shortcut only for system admins", async () => {
        renderManageDevices();

        fireEvent.click(await screen.findByRole("button", {name: "Open admin dashboard"}));
        expect(await screen.findByRole("heading", {name: "Admin dashboard"})).toBeInTheDocument();

        mockedGetIdTokenResult.mockResolvedValueOnce({claims: {}} as any);
        renderManageDevices();
        await screen.findByText("3 active FlexPayz products");
        expect(screen.queryByRole("button", {name: "Open admin dashboard"})).not.toBeInTheDocument();
    });
});

describe("ManageDevices activation wizard", () => {
    it("normalizes code input, looks up product, and waits for explicit activation", async () => {
        mockedGetDocs.mockResolvedValue(querySnap([{id: "p4", data: products.p4}]) as any);
        renderManageDevices();

        fireEvent.click(await screen.findByRole("button", {name: "Add a device"}));
        fireEvent.change(screen.getByLabelText("Activation code"), {target: {value: "a7c-9f2"}});

        expect(screen.getByLabelText("Activation code")).toHaveValue("A7C9F2");
        fireEvent.click(screen.getByRole("button", {name: "Continue"}));

        expect(await screen.findByRole("heading", {name: "Confirm your product."})).toBeInTheDocument();
        expect(screen.getByText("New Product")).toBeInTheDocument();
        expect(mockedUpdateDoc).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", {name: "Use a different code"}));
        expect(screen.getByLabelText("Activation code")).toHaveValue("A7C9F2");
    });

    it("shows code-not-found and already-activated recovery states", async () => {
        mockedGetDocs.mockResolvedValueOnce(querySnap([]) as any);
        renderManageDevices();

        fireEvent.click(await screen.findByRole("button", {name: "Add a device"}));
        fireEvent.change(screen.getByLabelText("Activation code"), {target: {value: "xxxxxx"}});
        fireEvent.click(screen.getByRole("button", {name: "Continue"}));
        expect(await screen.findByText("Code not found")).toBeInTheDocument();

        mockedGetDocs.mockResolvedValueOnce(querySnap([{id: "p1", data: products.p1}]) as any);
        fireEvent.change(screen.getByLabelText("Activation code"), {target: {value: "aaaaaa"}});
        fireEvent.click(screen.getByRole("button", {name: "Continue"}));
        expect(await screen.findByText("Already activated")).toBeInTheDocument();
    });

    it("activates only after confirmation, shows success, and opens setup route", async () => {
        mockedGetDocs.mockResolvedValue(querySnap([{id: "p4", data: products.p4}]) as any);
        renderManageDevices();

        fireEvent.click(await screen.findByRole("button", {name: "Add a device"}));
        fireEvent.change(screen.getByLabelText("Activation code"), {target: {value: "A7C9F2"}});
        fireEvent.click(screen.getByRole("button", {name: "Continue"}));

        expect(await screen.findByRole("heading", {name: "Confirm your product."})).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Activate this device"}));

        await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalledWith({path: "products/p4"}, {activated: true}));
        expect(mockedUpdateDoc).toHaveBeenCalledWith({path: "users/user-1"}, {products: {arrayUnion: "p4"}});
        expect(await screen.findByRole("heading", {name: "Your device is ready."})).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Set up your device"}));
        expect(await screen.findByRole("heading", {name: "Manage device page"})).toBeInTheDocument();
    });

    it("cancels activation without mutating ownership", async () => {
        renderManageDevices();

        fireEvent.click(await screen.findByRole("button", {name: "Add a device"}));
        fireEvent.click(screen.getAllByRole("button", {name: "Cancel activation"})[0]);

        expect(await screen.findByRole("heading", {name: "My devices"})).toBeInTheDocument();
        expect(mockedUpdateDoc).not.toHaveBeenCalled();
    });
});
