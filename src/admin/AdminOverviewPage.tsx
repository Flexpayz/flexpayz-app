import { useNavigate } from "react-router";
import { Box, Stack } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { AppButton, Surface } from "../components/design-system";
import { useAdminAuth } from "./AdminAuthContext";
import { ADMIN_ROUTES } from "./adminRoutes";
import { getAdminEnvironment, getAdminEnvironmentDetail } from "./environment";

export function AdminOverviewPage() {
  const { state } = useAdminAuth();
  const navigate = useNavigate();
  const environment = getAdminEnvironment();
  const environmentDetail = getAdminEnvironmentDetail();
  const email = state.status === "authorized" ? state.user.email : null;
  const quickRoutes = ADMIN_ROUTES.filter((route) => route.id !== "dashboard");

  return (
    <Stack spacing={4} className="admin-overview">
      <Surface className="admin-overview-hero">
        <Stack spacing={3}>
          <Box component="p" className="fp-typography-eyebrow">System admin</Box>
          <Box component="h2" className="fp-typography-heading">FlexPayz Admin</Box>
          <Box component="p" className="admin-muted">
            Manage product inventory and operational tools from one protected console. Metrics and deeper workflow redesigns will be added in later phases.
          </Box>
          <Box className="admin-overview-meta">
            <span>Signed in as <strong>{email || "administrator"}</strong></span>
            <span className={`admin-environment admin-environment-${environment.toLowerCase()}`} title={environmentDetail}>{environment}</span>
          </Box>
        </Stack>
      </Surface>

      <Box className="admin-quick-grid">
        {quickRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <Surface key={route.id} className={`admin-quick-card${route.advanced ? " admin-quick-card-advanced" : ""}`}>
              <Stack spacing={2}>
                <Box className="admin-quick-card-icon" aria-hidden="true">
                  <Icon />
                </Box>
                <Box>
                  <Box component="h3">{route.label}</Box>
                  <Box component="p" className="admin-muted">{route.description}</Box>
                </Box>
                <AppButton
                  variant="outlined"
                  onClick={() => navigate(route.path)}
                  endIcon={<ArrowForwardRoundedIcon aria-hidden="true" />}
                >
                  Open
                </AppButton>
              </Stack>
            </Surface>
          );
        })}
      </Box>
    </Stack>
  );
}
