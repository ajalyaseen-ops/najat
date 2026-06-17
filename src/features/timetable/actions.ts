"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { timetableSlotSchema, type TimetableSlotInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Add a timetable slot. Enforces unique(class_id, period_id, day_of_week) at the DB level. */
export async function createTimetableSlot(input: TimetableSlotInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "timetable:write")) return { ok: false, error: "forbidden" };

  const parsed = timetableSlotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_slots")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) {
    // Unique violation → friendly message
    if (error.code === "23505") return { ok: false, error: "تعارض: هذه الحصة محجوزة مسبقاً لهذا الفصل أو المعلم." };
    return { ok: false, error: error.message };
  }

  await logAudit("timetable.create", "timetable_slots", data.id, {
    class_id: parsed.data.class_id,
    day: parsed.data.day_of_week,
    period: parsed.data.period_id,
  });
  revalidatePath("/timetable");
  return { ok: true };
}

/** Delete a timetable slot. */
export async function deleteTimetableSlot(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "timetable:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("timetable.delete", "timetable_slots", id);
  revalidatePath("/timetable");
  return { ok: true };
}
