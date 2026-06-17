"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  upsertCoverageSchema,
  createPlanSchema,
  type UpsertCoverageInput,
  type CreatePlanInput,
} from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Upsert a coverage record for one lesson+class. Requires curriculum:write. */
export async function upsertCoverage(input: UpsertCoverageInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "curriculum:write"))
    return { ok: false, error: "forbidden" };

  const parsed = upsertCoverageSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { lesson_id, class_id, status, covered_on } = parsed.data;

  const { error } = await supabase.from("curriculum_coverage").upsert(
    {
      school_id: profile.schoolId!,
      lesson_id,
      class_id,
      status,
      covered_on: covered_on ?? null,
      recorded_by: profile.id,
    },
    { onConflict: "lesson_id,class_id" }
  );

  if (error) return { ok: false, error: error.message };

  await logAudit("curriculum.coverage.upsert", "curriculum_coverage", lesson_id, {
    class_id,
    status,
  });
  revalidatePath("/curriculum");
  return { ok: true };
}

/** Create a new curriculum plan. Requires curriculum:write. */
export async function createCurriculumPlan(input: CreatePlanInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "curriculum:write"))
    return { ok: false, error: "forbidden" };

  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_plans")
    .insert({
      school_id: profile.schoolId!,
      title: parsed.data.title,
      subject_id: parsed.data.subject_id,
      grade_level_id: parsed.data.grade_level_id ?? null,
      academic_year_id: parsed.data.academic_year_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit("curriculum.plan.create", "curriculum_plans", data.id, {
    title: parsed.data.title,
  });
  revalidatePath("/curriculum");
  return { ok: true };
}
