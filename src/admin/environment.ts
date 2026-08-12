import { firebaseApp } from "../firebase";

export type AdminEnvironment = "Production" | "Development" | "Local";

export function getAdminEnvironment(hostname = window.location.hostname): AdminEnvironment {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
    return "Local";
  }

  if (process.env.NODE_ENV !== "production") {
    return "Development";
  }

  return "Production";
}

export function getAdminEnvironmentDetail() {
  const projectId = firebaseApp.options.projectId;
  return typeof projectId === "string" && projectId.length > 0 ? projectId : "unknown project";
}

