import {render, screen, waitFor} from "@testing-library/react";
import {BrowserRouter} from "react-router-dom";
import {onAuthStateChanged} from "firebase/auth";
import {getSerialNumber} from "./firestore/repositories/serialNumbers";
import App from "./App";

jest.mock("./firebase", () => ({db: {}, storage: {}, firebaseApp: {}}));
jest.mock("firebase/auth", () => ({getAuth: jest.fn(() => ({currentUser: null})), onAuthStateChanged: jest.fn()}));
jest.mock("./admin/adminRoutes", () => ({createAdminRouteElements: () => null}));
jest.mock("react-toastify", () => ({ToastContainer: () => null}));
jest.mock("./firestore/repositories/serialNumbers", () => ({getSerialNumber: jest.fn()}));
jest.mock("./Pages/login-page", () => ({LoginPageWrapper: () => <h1>LoginPageWrapper</h1>}));
jest.mock("./Pages/landing-page", () => ({FirstPageWrapper: () => <h1>FirstPageWrapper</h1>}));
jest.mock("./Pages/manage-devices", () => ({ManageDevices: () => <h1>ManageDevices</h1>}));
jest.mock("./Pages/manage-device", () => ({ManageDevice: () => <h1>ManageDevice</h1>}));
jest.mock("./components/business-settings", () => ({BusinessSettingsWrapper: () => <h1>BusinessSettingsWrapper</h1>}));
jest.mock("./components/custom-link-settings", () => ({CustomLinkSettingsWrapper: () => <h1>CustomLinkSettingsWrapper</h1>}));
jest.mock("./components/upload-file-settings", () => ({UploadFileSettingsWrapper: () => <h1>UploadFileSettingsWrapper</h1>}));
jest.mock("./components/upload-video-settings", () => ({UploadVideoSettingsWrapper: () => <h1>UploadVideoSettingsWrapper</h1>}));
jest.mock("./components/upload-songs-settings", () => ({UploadSongsSettingsWrapper: () => <h1>UploadSongsSettingsWrapper</h1>}));
jest.mock("./components/shared-contacts", () => ({SharedContacts: () => <h1>SharedContacts</h1>}));
jest.mock("./components/baby-journal-settings", () => ({BabyJournalSettings: () => <h1>BabyJournalSettings</h1>}));
jest.mock("./components/adult-journal-settings", () => ({AdultJournalSettings: () => <h1>AdultJournalSettings</h1>}));
jest.mock("./Pages/animal-tag/animal-tag-settings", () => ({AnimalTagSettingsWrapper: () => <h1>AnimalTagSettingsWrapper</h1>}));
jest.mock("./components/design-system/DesignSystemPreview", () => ({DesignSystemPreview: () => <h1>DesignSystemPreview</h1>}));
jest.mock("./Pages/show-product", () => ({ShowProduct: () => <h1>ShowProduct</h1>}));

beforeEach(() => {
    jest.clearAllMocks();
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, next) => {
        next(null);
        return jest.fn();
    });
});

function visit(path: string) {
    window.history.replaceState({}, "", path);
    return render(<BrowserRouter><App/></BrowserRouter>);
}

it.each([
    ["/", "FirstPageWrapper"],
    ["/app", "FirstPageWrapper"],
    ["/show-product?product_id=public-product", "ShowProduct"],
])("opens public route %s without initializing the sign-in guard", (path, page) => {
    visit(path);
    expect(screen.getByRole("heading", {name: page})).toBeInTheDocument();
    expect(onAuthStateChanged).not.toHaveBeenCalled();
    expect(window.location.pathname).not.toBe("/login");
});

it("resolves a serial-number link to the public page while signed out", async () => {
    (getSerialNumber as jest.Mock).mockResolvedValue({id: "SERIAL-1", data: {productID: "public-product", type: "default"}});
    visit("/redirect?serialNumber=SERIAL-1");
    expect(await screen.findByRole("heading", {name: "ShowProduct"})).toBeInTheDocument();
    expect(getSerialNumber).toHaveBeenCalledWith("SERIAL-1");
    expect(window.location.pathname + window.location.search).toBe("/show-product?product_id=public-product");
    expect(onAuthStateChanged).not.toHaveBeenCalled();
});

it.each([
    "/manage-devices", "/manage-device", "/manage-device/business-card",
    "/manage-device/custom-link", "/manage-device/upload-files", "/manage-device/upload-video",
    "/manage-device/upload-songs", "/manage-device/shared-contacts", "/manage-device/baby-journal",
    "/manage-device/adult-journal", "/manage-device/animal-tag",
])("requires login for editor route %s", async (path) => {
    visit(`${path}?product_id=public-product`);
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(screen.getByRole("heading", {name: "LoginPageWrapper"})).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(`${path}?product_id=public-product`);
});
