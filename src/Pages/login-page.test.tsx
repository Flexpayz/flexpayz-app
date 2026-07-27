import {fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {useState} from "react";
import {LoginPageWrapper} from "./login-page";
import {FirstPageWrapper} from "./landing-page";
import {MainContext} from "../contexts";
import {FlexPayzThemeProvider} from "../theme";

jest.mock("../control-state", () => ({
    defaultProduct: {},
}));

const initialState = {
    login: {email: "", password: ""},
    register: {email: "", password: "", confirmPassword: "", country: ""},
    userId: "",
    invalidFields: new Map(),
};

function renderEntryPage(initialEntry = "/app") {
    function TestHarness() {
        const [state, setState] = useState(initialState);

        return (
            <FlexPayzThemeProvider>
                <MainContext.Provider value={{state, setState, db: {}}}>
                    <MemoryRouter initialEntries={[initialEntry]}>
                        <Routes>
                            <Route path="/" element={<FirstPageWrapper/>}/>
                            <Route path="/app" element={<FirstPageWrapper/>}/>
                            <Route path="/login" element={<LoginPageWrapper/>}/>
                        </Routes>
                    </MemoryRouter>
                </MainContext.Provider>
            </FlexPayzThemeProvider>
        );
    }

    return render(<TestHarness/>);
}

describe("FirstPageWrapper entry page", () => {
    it("renders the redesigned entry controls on /app with accessible names", () => {
        renderEntryPage();

        expect(screen.getByRole("heading", {name: /one tap\. everything connected\./i})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Manage my devices"})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Explore the webshop"})).toHaveAttribute("href", "https://www.flexpayz.se");
        expect(screen.getByRole("button", {name: "Help and support"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Language selector, English"})).toBeInTheDocument();
    });

    it("renders the redesigned entry controls on /", () => {
        renderEntryPage("/");

        expect(screen.getByRole("heading", {name: /one tap\. everything connected\./i})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Manage my devices"})).toBeInTheDocument();
    });

    it("preserves the manage devices path by navigating to the login flow", () => {
        renderEntryPage();

        fireEvent.click(screen.getByRole("button", {name: "Manage my devices"}));

        expect(screen.getByRole("button", {name: "Log in"})).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });
});
