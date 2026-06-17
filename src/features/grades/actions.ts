"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  gradesBulkSchema,
  assessmentCreateSchema,
  type GradesBulkInput,
  type AssessmentCreateInput,
} from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Bulk-upsert grades for all students on a given class/subject/term.
 * Each entry is matched by (assessment_id, student_id) — ON CONFLICT handled via upsert.
 */
export async function saveGrades(input: GradesBulkInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "grades:write")) return { ok: false, error: "forbidden" };

  const parsed = gradesBulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();

  // Filter to non-null scores (or explicitly set scores including 0)
  const rows = parsed.data.grades
    .filter((g) => g.score !== null && g.score !== undefined)
    .map((g) => ({
      school_id: profile.schoolId!,
      assessment_id: g.assessment_id,
      student_id: g.student_id,
      score: g.score,
      note: g.note ?? null,
    }));

  if (rows.length === 0) return { ok: true };

  const { error } = await supabase.from("grades").upsert(rows, {
    onConflict: "assessment_id,student_id",
    ignoreDuplicates: false,
  });

  if (error) return { ok: false, error: error.message };

  await logAudit("grades.bulk_save", "grades", null, {
    class_id: parsed.data.class_id,
    subject_id: parsed.data.subject_id,
    term: parsed.data.term,
    count: rows.length,
  });

  revalidatePath("/grades");
  return { ok: true };
}

/**
 * Create a new assessment for a class/subject.
 */
export async function createAssessment(input: AssessmentCreateInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "grades:write")) return { ok: false, error: "forbidden" };

  const parsed = assessmentCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      school_id: profile.schoolId!,
      class_id: parsed.data.class_id,
      subject_id: parsed.data.subject_id,
      assessment_type_id: parsed.data.assessment_type_id ?? null,
      term: parsed.data.term,
      title: parsed.data.title,
      max_score: parsed.data.max_score,
      date: parsed.data.date ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit("assessment.create", "assessments", data.id, {
    title: parsed.data.title,
    class_id: parsed.data.class_id,
    subject_id: parsed.data.subject_id,
  });

  revalidatePath("/grades");
  return { ok: true };
}

/**
 * Archive (delete) an assessment by id — cascades to grades rows via FK.
 */
export async function archiveAssessment(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "grades:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("assessment.archive", "assessments", id);
  revalidatePath("/grades");
  return { ok: true };
}
