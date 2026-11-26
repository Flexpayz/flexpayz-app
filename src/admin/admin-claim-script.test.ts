const {
  cleanupLegacyAdminClaims,
  claimsForMode,
  grantSystemAdminClaims,
  revokeSystemAdminClaims,
  summarizeClaims,
} = require("../../admin-scripts/setAdminClaim.cjs");

export {};

describe("setAdminClaim script claim transforms", () => {
  it("grants system-admin while removing the old admin property and preserving unrelated claims", () => {
    expect(grantSystemAdminClaims({admin: true, team: "ops"})).toEqual({
      role: "system-admin",
      team: "ops",
    });
  });

  it("cleans the old admin property only when the canonical role is present", () => {
    expect(cleanupLegacyAdminClaims({admin: true, role: "system-admin", team: "ops"})).toEqual({
      role: "system-admin",
      team: "ops",
    });
    expect(() => cleanupLegacyAdminClaims({admin: true, team: "ops"})).toThrow(/role is not "system-admin"/);
  });

  it("revokes system-admin while preserving unrelated claims and removing old admin", () => {
    expect(revokeSystemAdminClaims({admin: true, role: "system-admin", team: "ops"})).toEqual({
      team: "ops",
    });
    expect(revokeSystemAdminClaims({admin: true, role: "user", team: "ops"})).toEqual({
      role: "user",
      team: "ops",
    });
  });

  it("routes modes to the expected transform and summarizes without exposing claim values beyond role/admin state", () => {
    expect(claimsForMode("cleanup-legacy", {admin: true, role: "system-admin", billing: "sensitive"})).toEqual({
      role: "system-admin",
      billing: "sensitive",
    });
    expect(summarizeClaims({admin: true, role: "system-admin", billing: "sensitive"})).toEqual({
      role: "system-admin",
      hasOldAdminProperty: true,
      claimKeys: ["admin", "billing", "role"],
    });
  });
});
