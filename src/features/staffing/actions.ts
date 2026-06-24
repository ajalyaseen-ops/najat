"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { allocationSchema, staffPlanSchema, type AllocationInput, type StaffPlanInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Upsert one staffing cell. `periods === 0` removes the allocation so the sheet
 * stays sparse (no zero rows). Uniqueness is (year, dept, staff, class).
 */
export async function saveAllocation(input: AllocationInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "staffing:write")) return { ok: false, error: "forbidden" };

  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  const { staff_id, class_id, department_id, academic_year_id, periods } = parsed.data;

  const supabase = await createClient();

  if (periods === 0) {
    const { error } = await supabase
      .from("staffing_allocations" as any)
      .delete()
      .match({ staff_id, class_id, department_id, academic_year_id });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("staffing_allocations" as any)
      .upsert(
        { staff_id, class_id, department_id, academic_year_id, periods, school_id: profile.schoolId! } as any,
        { onConflict: "academic_year_id,department_id,staff_id,class_id" }
      );
    if (error) return { ok: false, error: error.message };
  }

  await logAudit("staffing.allocate", "staffing_allocations", `${staff_id}:${class_id}`, { periods });
  revalidatePath("/staffing");
  return { ok: true };
}

/** Update a teacher's load target, exempt periods, and role tags. */
export async function updateStaffPlan(staffId: string, input: StaffPlanInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "staffing:write")) return { ok: false, error: "forbidden" };

  const parsed = staffPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({
      nisab: parsed.data.nisab,
      exempt_periods: parsed.data.exempt_periods,
      ...(parsed.data.role_tags ? { role_tags: parsed.data.role_tags } : {}),
    } as any)
    .eq("id", staffId);
  if (error) return { ok: false, error: error.message };

  await logAudit("staffing.plan_update", "staff", staffId, parsed.data);
  revalidatePath("/staffing");
  return { ok: true };
}
