import {act, render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes, useLocation} from "react-router-dom";
import {onAuthStateChanged} from "firebase/auth";
import {RequireProductSession} from "./require-product-session";

jest.mock("../firebase", () => ({firebaseApp: {}}));
jest.mock("firebase/auth", () => ({getAuth: jest.fn(() => ({})), onAuthStateChanged: jest.fn()}));

let publishUser: (user: {uid: string} | null) => void;
let failAuth: (error: {code: string}) => void;
const unsubscribe = jest.fn();
const editorMounted = jest.fn();

function Editor() {
    editorMounted();
    return <h1>Product editor</h1>;
}

function LoginProbe() {
    const location = useLocation();
    return <p>Return to: {new URLSearchParams(location.search).get("returnTo")}</p>;
}

function renderRoute(path = "/manage-device/business-card?product_id=example#social") {
    return render(<MemoryRouter initialEntries={[path]}><Routes>
        <Route element={<RequireProductSession/>}>
            <Route path="/manage-device/business-card" element={<Editor/>}/>
        </Route>
        <Route path="/login" element={<LoginProbe/>}/>
        <Route path="/show-product" element={<h1>Public page</h1>}/>
    </Routes></MemoryRouter>);
}

beforeEach(() => {
    jest.clearAllMocks();
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, next, error) => {
        publishUser = next;
        failAuth = error;
        return unsubscribe;
    });
});

it("waits for Firebase before mounting the editor and unsubscribes on unmount", () => {
    const view = renderRoute();
    expect(screen.getByText("Restoring your session")).toBeInTheDocument();
    expect(editorMounted).not.toHaveBeenCalled();
    act(() => publishUser({uid: "owner"}));
    expect(screen.getByText("Product editor")).toBeInTheDocument();
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it("redirects signed-out deep links to login with the product query and hash intact", () => {
    renderRoute();
    act(() => publishUser(null));
    expect(screen.getByText("Return to: /manage-device/business-card?product_id=example#social")).toBeInTheDocument();
    expect(editorMounted).not.toHaveBeenCalled();
});

it("removes the editor if the session is signed out while it is open", () => {
    renderRoute();
    act(() => publishUser({uid: "owner"}));
    act(() => publishUser(null));
    expect(screen.queryByText("Product editor")).not.toBeInTheDocument();
    expect(screen.getByText(/^Return to:/)).toBeInTheDocument();
});

it("routes authentication errors to login without mounting the editor", () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
    renderRoute();
    act(() => failAuth({code: "auth/network-request-failed"}));
    expect(editorMounted).not.toHaveBeenCalled();
    expect(screen.getByText(/^Return to:/)).toBeInTheDocument();
    log.mockRestore();
});

it("leaves public pages accessible without a session", () => {
    renderRoute("/show-product?product_id=example");
    expect(screen.getByText("Public page")).toBeInTheDocument();
    expect(onAuthStateChanged).not.toHaveBeenCalled();
});
