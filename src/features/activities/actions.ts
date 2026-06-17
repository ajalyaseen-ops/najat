"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { activitySchema, type ActivityInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create an activity. Requires activities:write. */
export async function createActivity(input: ActivityInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "activities:write"))
    return { ok: false, error: "forbidden" };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("activity.create", "activities", data.id, { name: parsed.data.name });
  revalidatePath("/activities");
  return { ok: true };
}

/** Update an existing activity. */
export async function updateActivity(id: string, input: ActivityInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "activities:write"))
    return { ok: false, error: "forbidden" };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  await logAudit("activity.update", "activities", id, { name: parsed.data.name });
  revalidatePath("/activities");
  return { ok: true };
}

/** Delete an activity permanently. */
export async function deleteActivity(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "activities:write"))
    return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("activity.delete", "activities", id);
  revalidatePath("/activities");
  return { ok: true };
}
