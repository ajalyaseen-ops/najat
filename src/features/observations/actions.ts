"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { observationSchema, type ObservationInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a classroom observation. Requires observations:write. */
export async function createObservation(input: ObservationInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "observations:write"))
    return { ok: false, error: "forbidden" };

  const parsed = observationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("observations")
    .insert({
      ...parsed.data,
      school_id: profile.schoolId!,
      observer_id: profile.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("observation.create", "observations", data.id, {
    staff_id: parsed.data.staff_id,
  });
  revalidatePath("/observations");
  return { ok: true };
}

/** Update an existing observation. Requires observations:write. */
export async function updateObservation(
  id: string,
  input: ObservationInput
): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "observations:write"))
    return { ok: false, error: "forbidden" };

  const parsed = observationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("observations")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  await logAudit("observation.update", "observations", id);
  revalidatePath("/observations");
  return { ok: true };
}
