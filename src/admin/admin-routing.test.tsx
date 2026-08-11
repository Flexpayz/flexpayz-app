import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getAuth, getIdTokenResult, onAuthStateChanged, signOut } from "firebase/auth";
import { createAdminRouteElements } from "./adminRoutes";
import { safeReturnToPath } from "./returnTo";
import { FlexPayzThemeProvider } from "../theme";

type MockUser = {
  uid: string;
  email: string | null;
  getIdToken: jest.Mock<Promise<string>, [boolean?]>;
};

const mockAuth = {
  currentUser: null as MockUser | null,
};

let authUser: MockUser | null | undefined;
let claims: Record<string, unknown>;

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => mockAuth),
  getIdTokenResult: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedGetIdTokenResult = getIdTokenResult as jest.MockedFunction<typeof getIdTokenResult>;
const mockedOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;
const mockedSignOut = signOut as jest.MockedFunction<typeof signOut>;

function LoginProbe() {
  const location = useLocation();
  return <h1>Login page {location.search}</h1>;
}

function renderAdmin(initialEntry: string) {
  return render(
    <FlexPayzThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          {createAdminRouteElements({
            productsElement: <h2>Protected Products</h2>,
            serialMigrationElement: <h2>Serial Migration Tool</h2>,
            productLookupElement: <h2>Lookup Tool</h2>,
          })}
          <Route path="/login" element={<LoginProbe />} />
          <Route path="/manage-devices" element={<h1>Device Manager</h1>} />
        </Routes>
      </MemoryRouter>
    </FlexPayzThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  authUser = { uid: "admin-1", email: "admin@example.com", getIdToken: jest.fn(async () => "token") };
  mockAuth.currentUser = authUser;
  claims = { role: "system-admin" };
  mockedGetAuth.mockReturnValue(mockAuth as never);
  mockedGetIdTokenResult.mockImplementation(async () => ({ claims }) as never);
  mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
    if (authUser !== undefined) {
      (callback as (user: MockUser | null) => void)(authUser);
    }
    return jest.fn();
  });
  mockedSignOut.mockImplementation(async () => {
    mockAuth.currentUser = null;
  });
});

describe("admin route protection", () => {
  it("keeps protected content hidden while authentication is loading", () => {
    authUser = undefined;
    mockAuth.currentUser = null;

    renderAdmin("/admin/products");

    expect(screen.getByText("Loading admin console")).toBeInTheDocument();
    expect(screen.queryByText("Protected Products")).not.toBeInTheDocument();
  });

  it("authorizes role-based system admins and renders nested pages inside the shell", async () => {
    renderAdmin("/admin/products");

    expect(await screen.findByText("Protected Products")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Device Manager" })).toBeInTheDocument();
    expect(screen.getByText("System admin")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("denies users that only have the old admin claim", async () => {
    claims = { admin: true };

    renderAdmin("/admin/products");

    expect(await screen.findByRole("heading", { name: "Admin console unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("Protected Products")).not.toBeInTheDocument();
  });

  it("authorizes users with the role even if the old admin claim is still present", async () => {
    claims = { role: "system-admin", admin: true };

    renderAdmin("/admin/products");

    expect(await screen.findByText("Protected Products")).toBeInTheDocument();
  });

  it("denies users with a non-admin role or missing role", async () => {
    claims = { role: "user" };

    renderAdmin("/admin/products");

    expect(await screen.findByRole("heading", { name: "Admin console unavailable" })).toBeInTheDocument();
  });

  it("sends regular authenticated users to the forbidden page", async () => {
    claims = {};

    renderAdmin("/admin/products");

    expect(await screen.findByRole("heading", { name: "Admin console unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    expect(screen.queryByText("Protected Products")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to login with the requested admin URL", async () => {
    authUser = null;
    mockAuth.currentUser = null;

    renderAdmin("/admin/products?filter=inactive#top");

    expect(await screen.findByRole("heading", { name: /Login page/ })).toHaveTextContent(
      "?returnTo=%2Fadmin%2Fproducts%3Ffilter%3Dinactive%23top"
    );
  });

  it("shows auth errors with retry and sign-out actions", async () => {
    mockedGetIdTokenResult
      .mockRejectedValueOnce(new Error("token unavailable"))
      .mockResolvedValueOnce({ claims: { role: "system-admin" } } as never);

    renderAdmin("/admin/products");

    expect(await screen.findByRole("heading", { name: "We could not verify admin access" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Protected Products")).toBeInTheDocument();
    expect(authUser?.getIdToken).toHaveBeenCalledWith(true);
  });

  it("logs out from the admin profile menu", async () => {
    renderAdmin("/admin/products");

    expect(await screen.findByText("Protected Products")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open admin profile menu" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Logout" }));

    await waitFor(() => expect(mockedSignOut).toHaveBeenCalledWith(mockAuth));
    expect(await screen.findByRole("heading", { name: /Login page/ })).toBeInTheDocument();
  });
});

describe("admin shell routing", () => {
  it("renders breadcrumbs for nested routes and goes back to Device Manager", async () => {
    renderAdmin("/admin/serials/migrate");

    expect(await screen.findByText("Serial Migration Tool")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin breadcrumbs")).toHaveTextContent("Admin");
    expect(screen.getByLabelText("Admin breadcrumbs")).toHaveTextContent("Serial migration");
    fireEvent.click(screen.getByRole("button", { name: "Back to Device Manager" }));
    expect(await screen.findByRole("heading", { name: "Device Manager" })).toBeInTheDocument();
  });

  it("redirects old admin URLs to their nested replacements", async () => {
    renderAdmin("/admin/unlock-code");

    expect(await screen.findByText("Lookup Tool")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin breadcrumbs")).toHaveTextContent("Product lookup");
  });
});

describe("returnTo validation", () => {
  it("allows internal paths and rejects unsafe or external values", () => {
    expect(safeReturnToPath("/admin/products?filter=inactive#top")).toBe("/admin/products?filter=inactive#top");
    expect(safeReturnToPath("https://evil.example/admin")).toBeNull();
    expect(safeReturnToPath("//evil.example/admin")).toBeNull();
    expect(safeReturnToPath("/\\evil")).toBeNull();
  });
});
