/**
 * RBAC model — single source of truth, mirrored in the database
 * (see supabase/migrations/0002_rbac.sql). The DB enforces access via RLS;
 * the client uses this to show/hide UI. Never rely on the client check alone.
 */

export const ROLES = [
  "super_admin",
  "principal",
  "vice_principal",
  "department_head",
  "teacher",
  "activity_supervisor",
  "registrar",
  "finance_officer",
  "auditor",
  "student",
  "parent",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, { ar: string; en: string }> = {
  super_admin: { ar: "مدير النظام", en: "Super Administrator" },
  principal: { ar: "مدير المدرسة", en: "Principal" },
  vice_principal: { ar: "وكيل المدرسة", en: "Vice Principal" },
  department_head: { ar: "رئيس قسم", en: "Department Head" },
  teacher: { ar: "معلم", en: "Teacher" },
  activity_supervisor: { ar: "مشرف نشاط", en: "Activity Supervisor" },
  registrar: { ar: "مسؤول التسجيل", en: "Registrar" },
  finance_officer: { ar: "مسؤول مالي", en: "Finance Officer" },
  auditor: { ar: "مدقق النظام", en: "System Auditor" },
  student: { ar: "طالب", en: "Student" },
  parent: { ar: "ولي أمر", en: "Parent" },
};

/**
 * Permissions are `resource:action`. `*` is a wildcard granted to super_admin.
 */
export const PERMISSIONS = [
  "students:read", "students:write", "students:delete", "students:import",
  "teachers:read", "teachers:write",
  "classes:read", "classes:write",
  "subjects:read", "subjects:write",
  "departments:read", "departments:write",
  "attendance:read", "attendance:write",
  "grades:read", "grades:write",
  "timetable:read", "timetable:write",
  "staffing:read", "staffing:write",
  "curriculum:read", "curriculum:write",
  "islamic:read", "islamic:write",
  "behavior:read", "behavior:write",
  "observations:read", "observations:write",
  "activities:read", "activities:write",
  "reports:read",
  "communication:send",
  "analytics:read",
  "finance:read", "finance:write",
  "settings:write", "branding:write", "users:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Default role → permission matrix (a school can customize in the DB). */
export const ROLE_PERMISSIONS: Record<Role, Permission[] | ["*"]> = {
  super_admin: ["*"],
  principal: [
    "students:read", "students:write", "teachers:read", "teachers:write",
    "classes:read", "classes:write", "subjects:read", "subjects:write",
    "departments:read", "departments:write", "attendance:read", "grades:read",
    "timetable:read", "timetable:write", "staffing:read", "staffing:write",
    "curriculum:read", "islamic:read",
    "behavior:read", "behavior:write", "observations:read", "observations:write",
    "activities:read", "reports:read", "communication:send", "analytics:read",
    "settings:write", "branding:write", "users:manage", "audit:read",
  ],
  vice_principal: [
    "students:read", "students:write", "teachers:read", "classes:read",
    "classes:write", "attendance:read", "attendance:write", "grades:read",
    "timetable:read", "timetable:write", "staffing:read", "staffing:write",
    "curriculum:read", "behavior:read",
    "behavior:write", "observations:read", "observations:write", "activities:read",
    "reports:read", "communication:send", "analytics:read",
  ],
  department_head: [
    "students:read", "teachers:read", "classes:read", "subjects:read",
    "subjects:write", "departments:read", "grades:read", "curriculum:read",
    "curriculum:write", "observations:read", "observations:write", "reports:read",
    "analytics:read", "staffing:read",
  ],
  teacher: [
    "students:read", "classes:read", "subjects:read", "attendance:read",
    "attendance:write", "grades:read", "grades:write", "timetable:read",
    "curriculum:read", "curriculum:write", "islamic:read", "islamic:write",
    "behavior:read", "behavior:write", "communication:send", "reports:read",
  ],
  activity_supervisor: [
    "students:read", "activities:read", "activities:write", "attendance:read",
    "attendance:write", "communication:send",
  ],
  registrar: [
    "students:read", "students:write", "students:import", "students:delete",
    "classes:read", "classes:write", "attendance:read", "reports:read",
  ],
  finance_officer: ["finance:read", "finance:write", "students:read", "reports:read"],
  auditor: ["audit:read", "analytics:read", "reports:read"],
  student: ["grades:read", "attendance:read", "timetable:read", "activities:read"],
  parent: ["grades:read", "attendance:read", "timetable:read", "behavior:read"],
};

export function hasPermission(role: Role | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  const grants = ROLE_PERMISSIONS[role];
  if (!grants) return false;
  return (grants as string[]).includes("*") || (grants as string[]).includes(perm);
}
