import { ReactNode } from "react";
import { Navigate, Route } from "react-router";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import MoveUpOutlinedIcon from "@mui/icons-material/MoveUpOutlined";
import GetUnlockCode from "../Pages/GetUnlockCode";
import { SerialProductMigrationPage } from "../Pages/serial-product-migration";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { AdminShell } from "./AdminShell";
import { RequireSystemAdmin } from "./RequireSystemAdmin";
import { AdminProductCreatePage } from "./products/AdminProductCreatePage";
import { AdminProductDetailsPage } from "./products/AdminProductDetailsPage";
import { AdminProductsPage } from "./products/AdminProductsPage";

export type AdminRouteId = "dashboard" | "products" | "serial-migration" | "product-lookup";
export type AdminRouteGroup = "OVERVIEW" | "INVENTORY" | "OPERATIONS";

export type AdminNavRoute = {
  id: AdminRouteId;
  group: AdminRouteGroup;
  label: string;
  path: string;
  title: string;
  description: string;
  icon: typeof DashboardOutlinedIcon;
  advanced?: boolean;
};

export const ADMIN_ROUTES: AdminNavRoute[] = [
  {
    id: "dashboard",
    group: "OVERVIEW",
    label: "Dashboard",
    path: "/admin",
    title: "Dashboard",
    description: "Admin overview and quick access.",
    icon: DashboardOutlinedIcon,
  },
  {
    id: "products",
    group: "INVENTORY",
    label: "Products",
    path: "/admin/products",
    title: "Products",
    description: "Product creation, permissions, QR links and serial tools.",
    icon: Inventory2OutlinedIcon,
  },
  {
    id: "serial-migration",
    group: "OPERATIONS",
    label: "Serial migration",
    path: "/admin/serials/migrate",
    title: "Serial migration",
    description: "Advanced serial product reassignment workflow.",
    icon: MoveUpOutlinedIcon,
    advanced: true,
  },
  {
    id: "product-lookup",
    group: "OPERATIONS",
    label: "Product lookup",
    path: "/admin/tools/product-lookup",
    title: "Product lookup",
    description: "Find unlock codes from product and redirect links.",
    icon: ManageSearchOutlinedIcon,
  },
];

type AdminRouteElementsOptions = {
  overviewElement?: ReactNode;
  productsElement?: ReactNode;
  productCreateElement?: ReactNode;
  productDetailsElement?: ReactNode;
  serialMigrationElement?: ReactNode;
  productLookupElement?: ReactNode;
};

export function createAdminRouteElements(options: AdminRouteElementsOptions = {}) {
  return (
    <Route element={<RequireSystemAdmin />}>
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={options.overviewElement || <AdminOverviewPage />} />
        <Route path="products" element={options.productsElement || <AdminProductsPage />} />
        <Route path="products/create" element={options.productCreateElement || <AdminProductCreatePage />} />
        <Route path="products/:productId" element={options.productDetailsElement || <AdminProductDetailsPage />} />
        <Route path="serials/migrate" element={options.serialMigrationElement || <SerialProductMigrationPage />} />
        <Route path="tools/product-lookup" element={options.productLookupElement || <GetUnlockCode />} />
        <Route path="unlock-code" element={<Navigate to="/admin/tools/product-lookup" replace />} />
        <Route path="serial-migration" element={<Navigate to="/admin/serials/migrate" replace />} />
      </Route>
    </Route>
  );
}

export function findAdminRoute(pathname: string) {
  const exact = ADMIN_ROUTES.find((route) => route.path === pathname);
  if (exact) return exact;

  return ADMIN_ROUTES.find((route) => route.path !== "/admin" && pathname.startsWith(`${route.path}/`)) || ADMIN_ROUTES[0];
}

export function getAdminBreadcrumbLabels(pathname: string) {
  if (pathname === "/admin/products/create") return ["Admin", "Products", "Create products"];
  if (pathname === "/admin/serials/migrate") return ["Admin", "Serial numbers", "Migration"];
  return ["Admin", findAdminRoute(pathname).label];
}

export function getAdminPageTitle(pathname: string) {
  if (pathname === "/admin/products/create") return "Create products";
  if (pathname === "/admin/serials/migrate") return "Migration";
  return findAdminRoute(pathname).title;
}

export function getAdminRouteGroups() {
  return ADMIN_ROUTES.reduce<Array<{ group: AdminRouteGroup; routes: AdminNavRoute[] }>>((groups, route) => {
    const existing = groups.find((item) => item.group === route.group);
    if (existing) {
      existing.routes.push(route);
      return groups;
    }

    groups.push({ group: route.group, routes: [route] });
    return groups;
  }, []);
}
