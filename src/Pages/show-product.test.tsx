import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {doc, getDoc} from "firebase/firestore";
import {getDownloadURL, ref} from "firebase/storage";
import {FlexPayzThemeProvider} from "../theme";
import {MainContext} from "../contexts";
import {ShowProduct} from "./show-product";
import {Preview} from "../preview";
import {Languages} from "../languages";

jest.mock("../App", () => ({
    db: {},
    storage: {},
}));

jest.mock("./animal-tag/animal-tag-preview", () => ({
    AnimalTagPreviewWrapper: () => <div>Animal tag</div>,
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn((_db, ...path) => ({path: path.join('/')})),
    getDoc: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
    ref: jest.fn((_storage, path) => ({path})),
    getDownloadURL: jest.fn(),
}));

const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockedGetDownloadURL = getDownloadURL as jest.MockedFunction<typeof getDownloadURL>;

function snap(data: any, exists = true) {
    return {
        exists: () => exists,
        data: () => data,
    };
}

function renderPublicPage(initialEntry: string) {
    window.history.pushState({}, "", initialEntry);
    return render(
        <FlexPayzThemeProvider>
            <MainContext.Provider value={{db: {}}}>
                <MemoryRouter initialEntries={[initialEntry]}>
                    <ShowProduct/>
                </MemoryRouter>
            </MainContext.Provider>
        </FlexPayzThemeProvider>
    );
}

beforeEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
    (doc as jest.MockedFunction<typeof doc>).mockImplementation((_db: any, ...path: string[]) => ({path: path.join('/')}) as any);
    (ref as jest.MockedFunction<typeof ref>).mockImplementation((_storage: any, path?: string) => ({path}) as any);
    mockedGetDownloadURL.mockRejectedValue({code: "storage/object-not-found"});
});

describe("ShowProduct public i18n", () => {
    it("uses the owner default language on the password gate", async () => {
        mockedGetDoc.mockResolvedValue(snap({
            name: "Protected Ring",
            activated: true,
            inactive: false,
            preview: Preview.BUSINESS_CARD,
            visibleSections: [Preview.BUSINESS_CARD],
            publicPagePasswordActivated: true,
            publicPagePassword: "secret",
            previewLanguage: Languages.SWEDISH,
        }) as any);

        renderPublicPage("/show-product?product_id=p1");

        expect(await screen.findByRole("heading", {name: "Ange lösenord"})).toBeInTheDocument();
        expect(screen.getByLabelText("Lösenord")).toBeInTheDocument();
    });

    it("lets the URL language override local owner defaults on the dashboard", async () => {
        mockedGetDoc.mockResolvedValue(snap({
            name: "Travel Ring",
            activated: true,
            inactive: false,
            preview: Preview.BUSINESS_CARD,
            visibleSections: [Preview.BUSINESS_CARD, Preview.UPLOAD_FILE],
            publicPagePasswordActivated: false,
            publicPagePassword: "",
            previewLanguage: Languages.ENGLISH,
        }) as any);

        renderPublicPage("/show-product?product_id=p1&lang=fr");

        expect(await screen.findByText("Choisissez ce que vous voulez ouvrir.")).toBeInTheDocument();
        expect(screen.getByText("Carte de visite")).toBeInTheDocument();
        expect(screen.getByLabelText("Langue de la page publique")).toHaveValue(Languages.FRENCH);
    });
});
