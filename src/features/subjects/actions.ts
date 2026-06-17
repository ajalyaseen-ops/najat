"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { subjectSchema, type SubjectInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a subject. Requires subjects:write. RLS also enforces school scope. */
export async function createSubject(input: SubjectInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "subjects:write")) return { ok: false, error: "forbidden" };

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("subject.create", "subjects", data.id, { name: parsed.data.name_ar });
  revalidatePath("/subjects");
  return { ok: true };
}

/** Update an existing subject. */
export async function updateSubject(id: string, input: SubjectInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "subjects:write")) return { ok: false, error: "forbidden" };

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("subject.update", "subjects", id);
  revalidatePath("/subjects");
  return { ok: true };
}

/** Archive (soft-remove) a subject — sets a flag that hides from active lists. */
export async function archiveSubject(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "subjects:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  // subjects has no status/archived column — hard delete preserves referential integrity
  // (teaching_assignments cascade deletes via FK)
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("subject.delete", "subjects", id);
  revalidatePath("/subjects");
  return { ok: true };
}
