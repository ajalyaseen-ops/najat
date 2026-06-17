"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { teacherSchema, type TeacherInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a staff/teacher record. Requires teachers:write. RLS also enforces school scope. */
export async function createTeacher(input: TeacherInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "teachers:write")) return { ok: false, error: "forbidden" };

  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("teacher.create", "staff", data.id, { name: parsed.data.name_ar });
  revalidatePath("/teachers");
  return { ok: true };
}

/** Update an existing staff/teacher record. */
export async function updateTeacher(id: string, input: TeacherInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "teachers:write")) return { ok: false, error: "forbidden" };

  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("teacher.update", "staff", id);
  revalidatePath("/teachers");
  return { ok: true };
}

/** Archive (soft-remove) a staff member — preserves history. */
export async function archiveTeacher(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "teachers:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ status: "archived" }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("teacher.archive", "staff", id);
  revalidatePath("/teachers");
  return { ok: true };
}
