"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { feeStructureSchema, type FeeStructureInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a fee structure. Requires finance:write. */
export async function createFeeStructure(input: FeeStructureInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "finance:write")) return { ok: false, error: "forbidden" };

  const parsed = feeStructureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_structures")
    .insert({
      school_id: profile.schoolId!,
      name: parsed.data.name,
      amount: parsed.data.amount,
      grade_level_id: parsed.data.grade_level_id ?? null,
      academic_year_id: parsed.data.academic_year_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("fee_structure.create", "fee_structures", data.id, { name: parsed.data.name });
  revalidatePath("/finance");
  return { ok: true };
}

/** Update an existing fee structure. */
export async function updateFeeStructure(id: string, input: FeeStructureInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "finance:write")) return { ok: false, error: "forbidden" };

  const parsed = feeStructureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fee_structures")
    .update({
      name: parsed.data.name,
      amount: parsed.data.amount,
      grade_level_id: parsed.data.grade_level_id ?? null,
      academic_year_id: parsed.data.academic_year_id ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  await logAudit("fee_structure.update", "fee_structures", id);
  revalidatePath("/finance");
  return { ok: true };
}
