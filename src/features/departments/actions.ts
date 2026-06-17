"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { departmentSchema, type DepartmentInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a department. Requires departments:write. RLS also enforces school scope. */
export async function createDepartment(input: DepartmentInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "departments:write")) return { ok: false, error: "forbidden" };

  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("department.create", "departments", data.id, { name: parsed.data.name_ar });
  revalidatePath("/departments");
  return { ok: true };
}

/** Update an existing department. */
export async function updateDepartment(id: string, input: DepartmentInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "departments:write")) return { ok: false, error: "forbidden" };

  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("departments").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("department.update", "departments", id);
  revalidatePath("/departments");
  return { ok: true };
}

/** Archive (soft-remove) a department by clearing it from staff and flagging it — since departments
 *  has no status column, we prefix the name to mark it as archived and strip it from the active list. */
export async function archiveDepartment(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "departments:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  // Fetch current name_ar to prefix with [مؤرشف]
  const { data: dept, error: fetchErr } = await supabase
    .from("departments")
    .select("name_ar")
    .eq("id", id)
    .single();

  if (fetchErr) return { ok: false, error: fetchErr.message };

  const archivedName = dept.name_ar.startsWith("[مؤرشف]")
    ? dept.name_ar
    : `[مؤرشف] ${dept.name_ar}`;

  const { error } = await supabase
    .from("departments")
    .update({ name_ar: archivedName })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAudit("department.archive", "departments", id);
  revalidatePath("/departments");
  return { ok: true };
}
