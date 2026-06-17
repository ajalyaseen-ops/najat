"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { studentSchema, type StudentInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a student. Requires students:write. RLS also enforces school scope. */
export async function createStudent(input: StudentInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "students:write")) return { ok: false, error: "forbidden" };

  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("student.create", "students", data.id, { name: parsed.data.name_ar });
  revalidatePath("/students");
  return { ok: true };
}

/** Update an existing student. */
export async function updateStudent(id: string, input: StudentInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "students:write")) return { ok: false, error: "forbidden" };

  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("students").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("student.update", "students", id);
  revalidatePath("/students");
  return { ok: true };
}

/** Archive (soft-remove) a student — preserves history. */
export async function archiveStudent(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "students:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ status: "archived" }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("student.archive", "students", id);
  revalidatePath("/students");
  return { ok: true };
}
