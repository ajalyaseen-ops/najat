import { describe, it, expect } from "vitest";
import { hasPermission, ROLE_PERMISSIONS, ROLES } from "@/lib/rbac";

describe("RBAC", () => {
  it("super_admin has every permission (wildcard)", () => {
    expect(hasPermission("super_admin", "finance:write")).toBe(true);
    expect(hasPermission("super_admin", "audit:read")).toBe(true);
  });

  it("teacher can write attendance and grades but not manage users", () => {
    expect(hasPermission("teacher", "attendance:write")).toBe(true);
    expect(hasPermission("teacher", "grades:write")).toBe(true);
    expect(hasPermission("teacher", "users:manage")).toBe(false);
  });

  it("parent is read-only on their child's data", () => {
    expect(hasPermission("parent", "grades:read")).toBe(true);
    expect(hasPermission("parent", "grades:write")).toBe(false);
    expect(hasPermission("parent", "students:write")).toBe(false);
  });

  it("null role grants nothing", () => {
    expect(hasPermission(null, "students:read")).toBe(false);
  });

  it("every role has a defined permission set", () => {
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });
});
