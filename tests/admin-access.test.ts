import { describe, expect, it } from "vitest";
import { allowedSections, canAccessSection, hasAdminPermission } from "@/lib/admin/auth";
import type { AdminRole, AdminUser } from "@/lib/admin/admin-types";

function adminOf(role: AdminRole, permissions: string[] = []): AdminUser {
  return {
    id: "a1",
    userId: "u1",
    name: "T",
    email: "t@t.cd",
    role,
    permissions,
    departments: [],
    createdAt: "",
    lastLoginAt: "",
    status: "active",
  };
}

describe("admin section access", () => {
  it("super_admin sees every section", () => {
    const sections = allowedSections(adminOf("super_admin"), false);
    expect(sections).toContain("team");
    expect(sections).toContain("audit");
    expect(sections).toContain("billing");
    expect(sections).toContain("users");
  });

  it("support sees only essentials — no billing, team, audit or users", () => {
    const s = adminOf("support");
    for (const denied of ["billing", "team", "audit", "users", "network", "content"] as const) {
      expect(canAccessSection(s, false, denied)).toBe(false);
    }
    expect(canAccessSection(s, false, "support")).toBe(true);
    expect(canAccessSection(s, false, "moderation")).toBe(true);
    expect(canAccessSection(s, false, "overview")).toBe(true);
    expect(canAccessSection(s, false, "chat")).toBe(true);
  });

  it("moderator gets moderation + content but not billing", () => {
    const s = adminOf("moderator");
    expect(canAccessSection(s, false, "moderation")).toBe(true);
    expect(canAccessSection(s, false, "content")).toBe(true);
    expect(canAccessSection(s, false, "billing")).toBe(false);
    expect(canAccessSection(s, false, "support")).toBe(false);
  });

  it("analyst is nearly read-only", () => {
    const s = adminOf("analyst");
    expect(allowedSections(s, false)).toEqual(["overview", "search", "system", "chat"]);
  });

  it("env-listed admin without a row acts as super_admin", () => {
    expect(allowedSections(null, true).length).toBe(16);
    expect(canAccessSection(null, true, "team")).toBe(true);
  });

  it("non-admin gets nothing", () => {
    expect(allowedSections(null, false)).toEqual([]);
  });
});

describe("hasAdminPermission", () => {
  it("wildcard 'all' grants everything", () => {
    expect(hasAdminPermission(adminOf("super_admin", ["all"]), false, "billing.manage")).toBe(true);
  });
  it("specific permission required otherwise", () => {
    const m = adminOf("manager", ["billing.view"]);
    expect(hasAdminPermission(m, false, "billing.view")).toBe(true);
    expect(hasAdminPermission(m, false, "billing.manage")).toBe(false);
  });
  it("env-listed admin without row has all permissions", () => {
    expect(hasAdminPermission(null, true, "anything")).toBe(true);
    expect(hasAdminPermission(null, false, "anything")).toBe(false);
  });
});
