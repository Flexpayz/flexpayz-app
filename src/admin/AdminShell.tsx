import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  Avatar,
  Box,
  Breadcrumbs,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAdminAuth } from "./AdminAuthContext";
import { findAdminRoute } from "./adminRoutes";
import { getAdminEnvironment, getAdminEnvironmentDetail } from "./environment";

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, logout } = useAdminAuth();
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const activeRoute = useMemo(() => findAdminRoute(location.pathname), [location.pathname]);
  const environment = getAdminEnvironment();
  const environmentDetail = getAdminEnvironmentDetail();
  const email = state.status === "authorized" ? state.user.email : null;

  const handleLogout = async () => {
    setProfileAnchor(null);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box className="admin-shell">
      {/* Sidebar navigation is intentionally disabled for now.
      <Box className="admin-sidebar">
        <AdminNavigation />
      </Box>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="admin-mobile-drawer"
        PaperProps={{ className: "admin-mobile-drawer-paper" }}
      >
        <Box className="admin-drawer-header">
          <FlexPayzLogo className="admin-logo" />
          <IconButton aria-label="Close admin navigation" onClick={() => setDrawerOpen(false)}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <AdminNavigation />
      </Drawer>
      */}

      <Box className="admin-main">
        <Box component="header" className="admin-topbar">
          <Stack direction="row" spacing={2} alignItems="center" className="admin-title-row">
            <IconButton className="admin-back-button" aria-label="Back to Device Manager" onClick={() => navigate("/manage-devices")}>
              <ArrowBackRoundedIcon />
            </IconButton>
            <Box>
              <Breadcrumbs aria-label="Admin breadcrumbs" className="admin-breadcrumbs">
                <span>Admin</span>
                <span>{activeRoute.label}</span>
              </Breadcrumbs>
              <Box component="h1" className="admin-page-title">{activeRoute.title}</Box>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" className="admin-actions">
            <Box className={`admin-environment admin-environment-${environment.toLowerCase()}`} title={environmentDetail}>
              {environment}
            </Box>
            <button
              type="button"
              className="admin-profile-button"
              aria-label="Open admin profile menu"
              aria-haspopup="menu"
              aria-expanded={Boolean(profileAnchor)}
              onClick={(event) => setProfileAnchor(event.currentTarget)}
            >
              <Avatar className="admin-profile-avatar">{getInitials(email)}</Avatar>
              <span>
                <strong>{email || "Administrator"}</strong>
                <small>System admin</small>
              </span>
              <KeyboardArrowDownRoundedIcon fontSize="small" aria-hidden="true" />
            </button>
            <Menu
              anchorEl={profileAnchor}
              open={Boolean(profileAnchor)}
              onClose={() => setProfileAnchor(null)}
              MenuListProps={{ "aria-label": "Admin profile actions" }}
            >
              <MenuItem onClick={handleLogout}>
                <LogoutRoundedIcon fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Stack>
        </Box>

        <Box component="main" className="admin-content">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

/*
function AdminNavigation() {
  return (
    <Box component="nav" className="admin-navigation" aria-label="Admin navigation">
      <Box className="admin-sidebar-brand">
        <FlexPayzLogo className="admin-logo" />
        <span>Admin console</span>
      </Box>
      <Divider className="admin-sidebar-divider" />
      {getAdminRouteGroups().map((group) => (
        <Box key={group.group} className="admin-nav-group">
          <Box className="admin-nav-group-label">{group.group}</Box>
          <Stack spacing={1}>
            {group.routes.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.id}
                  to={route.path}
                  end={route.path === "/admin"}
                  className={({ isActive }) => `admin-nav-link${isActive ? " admin-nav-link-active" : ""}${route.advanced ? " admin-nav-link-advanced" : ""}`}
                >
                  <Icon fontSize="small" aria-hidden="true" />
                  <span>{route.label}</span>
                  {route.advanced && <em>Advanced</em>}
                </NavLink>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
*/

function getInitials(email: string | null) {
  if (!email) return "SA";
  return email.slice(0, 2).toUpperCase();
}
