"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { behaviorSchema, type BehaviorInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a behavior record. Requires behavior:write. */
export async function createBehaviorRecord(input: BehaviorInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "behavior:write")) return { ok: false, error: "forbidden" };

  const parsed = behaviorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("behavior_records")
    .insert({
      ...parsed.data,
      school_id: profile.schoolId!,
      recorded_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("behavior.create", "behavior_records", data.id, {
    student_id: parsed.data.student_id,
    kind: parsed.data.kind,
  });
  revalidatePath("/behavior");
  return { ok: true };
}

/** Update an existing behavior record. */
export async function updateBehaviorRecord(
  id: string,
  input: BehaviorInput
): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "behavior:write")) return { ok: false, error: "forbidden" };

  const parsed = behaviorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("behavior_records")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  await logAudit("behavior.update", "behavior_records", id);
  revalidatePath("/behavior");
  return { ok: true };
}

/** Delete a behavior record. */
export async function deleteBehaviorRecord(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "behavior:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("behavior_records").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("behavior.delete", "behavior_records", id);
  revalidatePath("/behavior");
  return { ok: true };
}
