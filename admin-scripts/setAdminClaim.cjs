const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { SYSTEM_ADMIN } = require("../src/admin/userRoles.json");

const PROJECT_ID = process.env.PROJECT_ID || "bussiness-card-bda7f";
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const USAGE = [
  "Usage:",
  "  node admin-scripts/setAdminClaim.cjs FIREBASE_AUTH_UID",
  "  node admin-scripts/setAdminClaim.cjs grant FIREBASE_AUTH_UID",
  "  node admin-scripts/setAdminClaim.cjs cleanup-legacy FIREBASE_AUTH_UID",
  "  node admin-scripts/setAdminClaim.cjs revoke FIREBASE_AUTH_UID",
].join("\n");

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    console.log("Running against project:", admin.app().options.projectId);
    return;
  }

  if (SA_PATH) {
    const abs = path.resolve(SA_PATH);
    if (!fs.existsSync(abs)) {
      console.error("Service account file not found at:", abs);
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert(require(abs)),
      projectId: PROJECT_ID,
    });
    console.log("Using service account:", abs);
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    });
    console.log("Using Application Default Credentials (gcloud).");
  }

  console.log("Running against project:", admin.app().options.projectId);
}

function parseArgs(argv = process.argv.slice(2)) {
  const first = (argv[0] || "").trim();
  if (first === "--help" || first === "-h") {
    console.log(USAGE);
    process.exit(0);
  }

  const modes = new Set(["grant", "cleanup-legacy", "revoke"]);
  const mode = modes.has(first) ? first : "grant";
  const uid = (modes.has(first) ? argv[1] : argv[0] || "").trim();

  if (!uid) {
    throw new Error(`Missing Firebase Auth UID.\n${USAGE}`);
  }

  return { mode, uid };
}

function grantSystemAdminClaims(customClaims = {}) {
  const { admin: _removedLegacyAdmin, ...remainingClaims } = customClaims;
  return {
    ...remainingClaims,
    role: SYSTEM_ADMIN,
  };
}

function cleanupLegacyAdminClaims(customClaims = {}) {
  if (customClaims.role !== SYSTEM_ADMIN) {
    throw new Error('Refusing cleanup: role is not "system-admin". Use revoke mode to remove the old admin property while revoking access.');
  }

  const { admin: _removedLegacyAdmin, ...remainingClaims } = customClaims;
  return remainingClaims;
}

function revokeSystemAdminClaims(customClaims = {}) {
  const { admin: _removedLegacyAdmin, role, ...remainingClaims } = customClaims;
  if (role !== SYSTEM_ADMIN && role !== undefined) {
    return {
      ...remainingClaims,
      role,
    };
  }

  return remainingClaims;
}

function claimKeys(customClaims = {}) {
  return Object.keys(customClaims).sort();
}

function summarizeClaims(customClaims = {}) {
  return {
    role: customClaims.role || null,
    hasOldAdminProperty: customClaims.admin === true,
    claimKeys: claimKeys(customClaims),
  };
}

function claimsForMode(mode, customClaims = {}) {
  if (mode === "cleanup-legacy") return cleanupLegacyAdminClaims(customClaims);
  if (mode === "revoke") return revokeSystemAdminClaims(customClaims);
  return grantSystemAdminClaims(customClaims);
}

async function main() {
  const { mode, uid } = parseArgs();
  initializeFirebaseAdmin();

  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims || {};
  const updatedClaims = claimsForMode(mode, existingClaims);
  const claimsPayload = Object.keys(updatedClaims).length ? updatedClaims : null;

  await auth.setCustomUserClaims(uid, claimsPayload);

  console.log(`Success: ${mode} completed for ${uid}.`);
  console.log("Before:", JSON.stringify(summarizeClaims(existingClaims)));
  console.log("After:", JSON.stringify(summarizeClaims(updatedClaims)));
  console.log("Unrelated custom claims were preserved.");
  console.log("The user needs a refreshed Firebase ID token or must sign in again before the new role is visible.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Failed to update admin role: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exit(1);
  });
}

module.exports = {
  cleanupLegacyAdminClaims,
  claimsForMode,
  grantSystemAdminClaims,
  parseArgs,
  revokeSystemAdminClaims,
  summarizeClaims,
};
