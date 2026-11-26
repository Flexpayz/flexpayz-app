import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { Box, Stack } from "@mui/material";
import { LoadingPanel, Surface, AppButton } from "../components/design-system";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthContext";
import { createLoginPath, getRequestedPath } from "./returnTo";
import "../Pages/admin.css";

export function RequireSystemAdmin() {
  return (
    <AdminAuthProvider>
      <SystemAdminBoundary />
    </AdminAuthProvider>
  );
}

function SystemAdminBoundary() {
  const { state } = useAdminAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <AdminCenteredPanel><LoadingPanel text="Loading admin console" /></AdminCenteredPanel>;
  }

  if (state.status === "unauthenticated") {
    return <Navigate to={createLoginPath(getRequestedPath(location))} replace />;
  }

  if (state.status === "forbidden") {
    return <AdminForbiddenPage email={state.user.email} />;
  }

  if (state.status === "error") {
    return <AdminAuthErrorPage />;
  }

  return <Outlet />;
}

function AdminCenteredPanel({ children }: { children: ReactNode }) {
  return (
    <Box className="admin-auth-panel">
      {children}
    </Box>
  );
}

function AdminForbiddenPage({ email }: { email: string | null }) {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const signOutAndReturn = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AdminCenteredPanel>
      <Surface className="admin-auth-card">
        <Stack spacing={3}>
          <Box component="p" className="fp-typography-eyebrow">Access denied</Box>
          <Box component="h1" className="fp-typography-heading">Admin console unavailable</Box>
          <Box component="p" className="admin-muted">
            The signed-in account cannot access the FlexPayz admin console.
          </Box>
          <Box component="p" className="admin-muted">
            If this account was just granted system-admin access, sign out and sign back in to refresh the session.
          </Box>
          {email && <Box className="admin-account-line">Signed in as <strong>{email}</strong></Box>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <AppButton variant="contained" onClick={() => navigate("/manage-devices")}>Back to Device Manager</AppButton>
            <AppButton variant="outlined" onClick={signOutAndReturn}>Sign out</AppButton>
          </Stack>
        </Stack>
      </Surface>
    </AdminCenteredPanel>
  );
}

function AdminAuthErrorPage() {
  const navigate = useNavigate();
  const { retry, logout } = useAdminAuth();

  const signOutAndReturn = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AdminCenteredPanel>
      <Surface className="admin-auth-card">
        <Stack spacing={3}>
          <Box component="p" className="fp-typography-eyebrow">Authentication error</Box>
          <Box component="h1" className="fp-typography-heading">We could not verify admin access</Box>
          <Box component="p" className="admin-muted">
            Refresh the Firebase ID token and try again, or sign out and use another account.
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <AppButton variant="contained" onClick={retry}>Retry</AppButton>
            <AppButton variant="outlined" onClick={signOutAndReturn}>Sign out</AppButton>
          </Stack>
        </Stack>
      </Surface>
    </AdminCenteredPanel>
  );
}
