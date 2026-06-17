"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { memorizeSchema, type MemorizeInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Add a new memorization record. Requires islamic:write. */
export async function createMemorizationRecord(input: MemorizeInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "islamic:write")) return { ok: false, error: "forbidden" };

  const parsed = memorizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quran_memorization")
    .insert({
      ...parsed.data,
      school_id: profile.schoolId!,
      assessed_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("islamic.memorization.create", "quran_memorization", data.id, {
    student_id: parsed.data.student_id,
    surah_number: parsed.data.surah_number,
  });
  revalidatePath("/islamic");
  return { ok: true };
}

/** Update an existing memorization record. */
export async function updateMemorizationRecord(
  id: string,
  input: MemorizeInput
): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "islamic:write")) return { ok: false, error: "forbidden" };

  const parsed = memorizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quran_memorization")
    .update({ ...parsed.data, assessed_by: profile.id })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  await logAudit("islamic.memorization.update", "quran_memorization", id);
  revalidatePath("/islamic");
  return { ok: true };
}
