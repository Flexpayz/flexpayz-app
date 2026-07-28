import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {useResetDevice} from "../useProductData";
import {FlexPayzThemeProvider} from "../theme";
import {ManageDevice} from "./manage-device";
import {Preview} from "../preview";
import {Languages} from "../languages";

jest.mock("../App", () => ({
    db: {},
    storage: {},
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn((_db, ...path) => ({path: path.join('/')})),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
}));

jest.mock("../useProductData", () => ({
    useResetDevice: jest.fn(),
}));

const mockedDoc = doc as jest.MockedFunction<typeof doc>;
const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockedUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockedUseResetDevice = useResetDevice as jest.MockedFunction<typeof useResetDevice>;

const product = {
    name: "Midnight Ring",
    activated: true,
    unlockCode: "A7C9F2",
    preview: Preview.BUSINESS_CARD,
    visibleSections: [Preview.UPLOAD_FILE, Preview.BUSINESS_CARD, Preview.CUSTOM_LINK],
    publicPagePassword: "secret",
    publicPagePasswordActivated: true,
    previewLanguage: Languages.ENGLISH,
};

const permissions = {
    business_card: true,
    custom_link: true,
    upload_files: true,
    upload_video: true,
    upload_songs: true,
    baby_journal: true,
    adult_journal: true,
    animal_tag: true,
};

function snap(data: any, exists = true) {
    return {
        exists: () => exists,
        data: () => data,
    };
}

function renderWorkspace(initialEntry = "/manage-device?product_id=p1") {
    window.history.pushState({}, '', initialEntry);
    return render(
        <FlexPayzThemeProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/manage-devices" element={<h1>My devices page</h1>}/>
                    <Route path="/manage-device" element={<ManageDevice/>}/>
                </Routes>
            </MemoryRouter>
        </FlexPayzThemeProvider>
    );
}

beforeEach(() => {
    jest.resetAllMocks();
    mockedDoc.mockImplementation((_db: any, ...path: string[]) => ({path: path.join('/')}) as any);
    mockedUpdateDoc.mockResolvedValue(undefined as any);
    mockedUseResetDevice.mockReturnValue(jest.fn().mockResolvedValue(undefined));
    mockedGetDoc.mockImplementation(async (ref: any) => {
        if (ref.path === "products/p1") return snap(product) as any;
        if (ref.path === "permissions/p1") return snap(permissions) as any;
        return snap(null, false) as any;
    });
});

describe("ManageDevice workspace", () => {
    it("renders the multiple-section overview and excludes Shared Contacts from public sections", async () => {
        renderWorkspace();

        expect(await screen.findByRole("heading", {name: "Midnight Ring"})).toBeInTheDocument();
        expect(screen.getByText("Opens an intermediary dashboard")).toBeInTheDocument();
        expect(screen.getByText("Business Card")).toBeInTheDocument();
        expect(screen.getByText("Custom Link")).toBeInTheDocument();
        expect(screen.getByText("Upload Files")).toBeInTheDocument();
        expect(screen.getByText("Private utility—not part of the public experience.")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Preview dashboard"})).toHaveAttribute("href", "/show-product?product_id=p1");
    });

    it("filters content by permissions and saves visible sections in fixed order", async () => {
        mockedGetDoc.mockImplementation(async (ref: any) => {
            if (ref.path === "products/p1") return snap({...product, visibleSections: [Preview.BUSINESS_CARD]}) as any;
            if (ref.path === "permissions/p1") return snap({...permissions, upload_files: false}) as any;
            return snap(null, false) as any;
        });

        renderWorkspace("/manage-device?product_id=p1&tab=content");

        expect(await screen.findByRole("heading", {name: "Content"})).toBeInTheDocument();
        expect(screen.getByText("Business Card")).toBeInTheDocument();
        expect(screen.queryByText("Upload Files")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Manage visible sections"}));
        const dialog = await screen.findByRole("dialog");
        fireEvent.click(within(dialog).getByRole("checkbox", {name: /Custom Link/i}));
        fireEvent.click(within(dialog).getByRole("checkbox", {name: /Upload Video/i}));
        fireEvent.click(within(dialog).getByRole("button", {name: "Save visible sections"}));

        await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalledWith(
            {path: "products/p1"},
            {visibleSections: [Preview.BUSINESS_CARD, Preview.CUSTOM_LINK, Preview.UPLOAD_VIDEO], preview: Preview.BUSINESS_CARD}
        ));
        expect(await screen.findByText("Visible sections updated")).toBeInTheDocument();
    });

    it("shows the explicit zero-section state without falling back to preview", async () => {
        mockedGetDoc.mockImplementation(async (ref: any) => {
            if (ref.path === "products/p1") return snap({...product, preview: Preview.BUSINESS_CARD, visibleSections: []}) as any;
            if (ref.path === "permissions/p1") return snap(permissions) as any;
            return snap(null, false) as any;
        });

        renderWorkspace();

        expect(await screen.findByText("Choose what people see.")).toBeInTheDocument();
        expect(screen.getByText("Visitors see a branded “This device is not configured” message until a section is selected.")).toBeInTheDocument();
    });

    it("saves rename and disables global password protection", async () => {
        renderWorkspace("/manage-device?product_id=p1&tab=settings");

        expect(await screen.findByRole("heading", {name: "Settings"})).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Device name"), {target: {value: "Evening Ring"}});
        fireEvent.click(screen.getByRole("button", {name: "Save name"}));

        await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalledWith({path: "products/p1"}, {name: "Evening Ring"}));

        fireEvent.click(screen.getByLabelText("Global password protection"));
        fireEvent.click(screen.getByRole("button", {name: "Disable protection"}));

        await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalledWith({path: "products/p1"}, {publicPagePasswordActivated: false}));
    });

    it("requires exact reset confirmation before running reset", async () => {
        const reset = jest.fn().mockResolvedValue(undefined);
        mockedUseResetDevice.mockReturnValue(reset);

        renderWorkspace("/manage-device?product_id=p1&tab=settings");

        expect(await screen.findByRole("heading", {name: "Settings"})).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Reset device"}));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByRole("button", {name: "Reset device"})).toBeDisabled();

        fireEvent.change(within(dialog).getByLabelText("Device name"), {target: {value: "midnight ring"}});
        expect(within(dialog).getByRole("button", {name: "Reset device"})).toBeDisabled();

        fireEvent.change(within(dialog).getByLabelText("Device name"), {target: {value: " Midnight Ring "}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Reset device"}));

        await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    });
});
