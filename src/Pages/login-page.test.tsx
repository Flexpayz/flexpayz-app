import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {useState} from "react";
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
} from "firebase/auth";
import {setDoc} from "firebase/firestore";
import {LoginPageWrapper} from "./login-page";
import {FirstPageWrapper} from "./landing-page";
import {MainContext} from "../contexts";
import {FlexPayzThemeProvider} from "../theme";

const mockAuth = {};
const mockUserDoc = {};

jest.mock("firebase/auth", () => ({
    getAuth: jest.fn(() => mockAuth),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn(() => mockUserDoc),
    setDoc: jest.fn(),
}));

jest.mock("../control-state", () => ({
    defaultProduct: {},
}));

const mockedSignIn = signInWithEmailAndPassword as jest.MockedFunction<typeof signInWithEmailAndPassword>;
const mockedCreateUser = createUserWithEmailAndPassword as jest.MockedFunction<typeof createUserWithEmailAndPassword>;
const mockedResetEmail = sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>;
const mockedSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;

const initialState = {
    login: {email: "", password: ""},
    register: {email: "", password: "", confirmPassword: "", country: ""},
    userId: "",
    invalidFields: new Map(),
};

function renderAuth(initialEntry = "/login") {
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
                            <Route path="/manage-devices" element={<h1>Manage devices</h1>}/>
                        </Routes>
                    </MemoryRouter>
                </MainContext.Provider>
            </FlexPayzThemeProvider>
        );
    }

    return render(<TestHarness/>);
}

beforeEach(() => {
    jest.clearAllMocks();
    mockedSignIn.mockResolvedValue({user: {uid: "user-1"}} as any);
    mockedCreateUser.mockResolvedValue({user: {uid: "user-2"}} as any);
    mockedResetEmail.mockResolvedValue(undefined);
    mockedSetDoc.mockResolvedValue(undefined as any);
});

afterEach(() => {
    jest.useRealTimers();
});

describe("Login authentication flow", () => {
    it("submits valid credentials and redirects to manage devices", async () => {
        renderAuth();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "user@example.com"}});
        fireEvent.change(screen.getByLabelText("Password"), {target: {value: "secret123"}});
        fireEvent.click(screen.getByRole("button", {name: /sign in/i}));

        await waitFor(() => expect(mockedSignIn).toHaveBeenCalledWith(mockAuth, "user@example.com", "secret123"));
        expect(await screen.findByRole("heading", {name: "Manage devices"})).toBeInTheDocument();
    });

    it("shows inline validation and does not submit invalid fields", () => {
        renderAuth();

        fireEvent.click(screen.getByRole("button", {name: /sign in/i}));

        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
        expect(screen.getByText("Enter your password.")).toBeInTheDocument();
        expect(mockedSignIn).not.toHaveBeenCalled();
    });

    it("shows loading state and maps Firebase sign-in errors", async () => {
        mockedSignIn.mockRejectedValueOnce({code: "auth/wrong-password"});
        renderAuth();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "user@example.com"}});
        fireEvent.change(screen.getByLabelText("Password"), {target: {value: "wrong123"}});
        fireEvent.click(screen.getByRole("button", {name: /sign in/i}));

        expect(screen.getByRole("button", {name: "Sign in"})).toBeDisabled();
        expect(screen.getByRole("progressbar", {name: "Loading"})).toBeInTheDocument();
        expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    });

    it("navigates to forgot password and registration, and toggles password visibility", () => {
        renderAuth();

        expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
        fireEvent.click(screen.getByRole("button", {name: "Show password"}));
        expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");

        fireEvent.click(screen.getByRole("button", {name: "Forgot password?"}));
        expect(screen.getByRole("heading", {level: 1, name: "Reset your password."})).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole("button", {name: "Return to sign in"}).at(-1)!);
        fireEvent.click(screen.getByRole("button", {name: /new to flexpayz/i}));
        expect(screen.getByRole("heading", {level: 1, name: "Create your account."})).toBeInTheDocument();
    });
});

describe("Registration authentication flow", () => {
    function goToRegister() {
        renderAuth();
        fireEvent.click(screen.getByRole("button", {name: /new to flexpayz/i}));
    }

    it("requires email, password, confirmation, country, and terms", () => {
        goToRegister();

        fireEvent.click(screen.getByRole("button", {name: /^create account$/i}));

        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
        expect(screen.getAllByText("Use at least 6 characters.").length).toBeGreaterThan(0);
        expect(screen.getByText("Select your country.")).toBeInTheDocument();
        expect(screen.getByText("Accept the Terms of Service and Privacy Policy.")).toBeInTheDocument();
        expect(mockedCreateUser).not.toHaveBeenCalled();
    });

    it("validates invalid email, weak password, and password mismatch", () => {
        goToRegister();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "bad"}});
        fireEvent.change(screen.getByLabelText("Password"), {target: {value: "123"}});
        fireEvent.change(screen.getByLabelText("Confirm password"), {target: {value: "different"}});
        fireEvent.change(screen.getByLabelText("Country"), {target: {value: "Sweden"}});
        fireEvent.click(screen.getByLabelText(/terms of service/i));
        fireEvent.click(screen.getByRole("button", {name: /^create account$/i}));

        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
        expect(screen.getByText("Use at least 6 characters.")).toBeInTheDocument();
        expect(screen.getByText("Passwords must match.")).toBeInTheDocument();
    });

    it("submits valid registration and redirects", async () => {
        goToRegister();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "new@example.com"}});
        fireEvent.change(screen.getByLabelText("Password"), {target: {value: "Secret123"}});
        fireEvent.change(screen.getByLabelText("Confirm password"), {target: {value: "Secret123"}});
        fireEvent.change(screen.getByLabelText("Country"), {target: {value: "Sweden"}});
        fireEvent.click(screen.getByLabelText(/terms of service/i));
        fireEvent.click(screen.getByRole("button", {name: /^create account$/i}));

        await waitFor(() => expect(mockedCreateUser).toHaveBeenCalledWith(mockAuth, "new@example.com", "Secret123"));
        await waitFor(() => expect(mockedSetDoc).toHaveBeenCalledWith(mockUserDoc, {country: "Sweden", products: []}));
        expect(await screen.findByRole("heading", {name: "Manage devices"})).toBeInTheDocument();
    });

    it("shows loading, Firebase errors, password controls, and login navigation", async () => {
        mockedCreateUser.mockRejectedValueOnce({code: "auth/email-already-in-use"});
        goToRegister();

        fireEvent.click(screen.getByRole("button", {name: "Show password"}));
        expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
        expect(screen.getByText(/Use at least 6 characters/i)).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "new@example.com"}});
        fireEvent.change(screen.getByLabelText("Password"), {target: {value: "Secret123"}});
        fireEvent.change(screen.getByLabelText("Confirm password"), {target: {value: "Secret123"}});
        fireEvent.change(screen.getByLabelText("Country"), {target: {value: "Sweden"}});
        fireEvent.click(screen.getByLabelText(/terms of service/i));
        fireEvent.click(screen.getByRole("button", {name: /^create account$/i}));

        expect(screen.getByRole("button", {name: "Create account"})).toBeDisabled();
        expect(screen.getByRole("progressbar", {name: "Loading"})).toBeInTheDocument();
        expect(await screen.findByText("Email already registered.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Sign in instead"}));
        expect(screen.getByRole("heading", {level: 1, name: "Welcome back."})).toBeInTheDocument();
    });
});

describe("Forgot password authentication flow", () => {
    function goToForgotPassword() {
        renderAuth();
        fireEvent.click(screen.getByRole("button", {name: "Forgot password?"}));
    }

    it("validates email before requesting a reset link", () => {
        goToForgotPassword();

        fireEvent.click(screen.getByRole("button", {name: /send reset link/i}));

        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
        expect(mockedResetEmail).not.toHaveBeenCalled();
    });

    it("sends reset email, masks address, and shows confirmation state", async () => {
        goToForgotPassword();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "robert@example.com"}});
        fireEvent.click(screen.getByRole("button", {name: /send reset link/i}));

        await waitFor(() => expect(mockedResetEmail).toHaveBeenCalledWith(mockAuth, "robert@example.com"));
        expect(await screen.findByRole("heading", {level: 1, name: "Check your inbox."})).toBeInTheDocument();
        expect(screen.getByText("We sent a password reset link to ro••••@example.com.")).toBeInTheDocument();
        expect(screen.getByText("The link will expire for your security.")).toBeInTheDocument();
    });

    it("returns to login and allows a different email address", async () => {
        goToForgotPassword();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "robert@example.com"}});
        fireEvent.click(screen.getByRole("button", {name: /send reset link/i}));
        expect(await screen.findByRole("heading", {level: 1, name: "Check your inbox."})).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Use a different email address"}));
        expect(screen.getByRole("heading", {level: 1, name: "Reset your password."})).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole("button", {name: "Return to sign in"}).at(-1)!);
        expect(screen.getByRole("heading", {level: 1, name: "Welcome back."})).toBeInTheDocument();
    });

    it("handles resend cooldown, resend operation, and reset failures", async () => {
        jest.useFakeTimers();
        goToForgotPassword();

        fireEvent.change(screen.getByLabelText("Email address"), {target: {value: "robert@example.com"}});
        fireEvent.click(screen.getByRole("button", {name: /send reset link/i}));
        expect(await screen.findByRole("heading", {level: 1, name: "Check your inbox."})).toBeInTheDocument();

        const resendButton = screen.getByRole("button", {name: /resend email/i});
        expect(resendButton).toBeDisabled();

        for (let second = 0; second < 46; second += 1) {
            await act(async () => {
                jest.advanceTimersByTime(1000);
            });
        }
        expect(screen.getByText("Ready")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /resend email/i})).not.toBeDisabled();

        mockedResetEmail.mockRejectedValueOnce({code: "auth/too-many-requests"});
        fireEvent.click(screen.getByRole("button", {name: /resend email/i}));

        expect(await screen.findByText("Too many attempts. Please wait and try again.")).toBeInTheDocument();
    });
});
