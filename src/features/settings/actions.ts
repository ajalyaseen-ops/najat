"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  schoolGeneralSchema,
  schoolCalendarSchema,
  academicYearSchema,
  type SchoolGeneralInput,
  type SchoolCalendarInput,
  type AcademicYearInput,
} from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

// ─── School: General ─────────────────────────────────────────────────────────

export async function updateSchoolGeneral(input: SchoolGeneralInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "settings:write")) return { ok: false, error: "forbidden" };
  if (!profile.schoolId) return { ok: false, error: "no_school" };

  const parsed = schoolGeneralSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update(parsed.data)
    .eq("id", profile.schoolId);

  if (error) return { ok: false, error: error.message };
  await logAudit("school.update_general", "schools", profile.schoolId);
  revalidatePath("/settings");
  return { ok: true };
}

// ─── School: Calendar ────────────────────────────────────────────────────────

export async function updateSchoolCalendar(input: SchoolCalendarInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "settings:write")) return { ok: false, error: "forbidden" };
  if (!profile.schoolId) return { ok: false, error: "no_school" };

  const parsed = schoolCalendarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ calendar: parsed.data.calendar })
    .eq("id", profile.schoolId);

  if (error) return { ok: false, error: error.message };
  await logAudit("school.update_calendar", "schools", profile.schoolId, { calendar: parsed.data.calendar });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── Academic Years ───────────────────────────────────────────────────────────

export async function createAcademicYear(input: AcademicYearInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "settings:write")) return { ok: false, error: "forbidden" };
  if (!profile.schoolId) return { ok: false, error: "no_school" };

  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .insert({ ...parsed.data, school_id: profile.schoolId, is_current: false })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("academic_year.create", "academic_years", data.id, { name: parsed.data.name });
  revalidatePath("/settings");
  return { ok: true };
}

export async function setCurrentAcademicYear(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "settings:write")) return { ok: false, error: "forbidden" };
  if (!profile.schoolId) return { ok: false, error: "no_school" };

  const supabase = await createClient();

  // Clear current flag for all years in this school, then set the chosen one.
  const { error: clearError } = await supabase
    .from("academic_years")
    .update({ is_current: false })
    .eq("school_id", profile.schoolId);
  if (clearError) return { ok: false, error: clearError.message };

  const { error } = await supabase
    .from("academic_years")
    .update({ is_current: true })
    .eq("id", id)
    .eq("school_id", profile.schoolId);
  if (error) return { ok: false, error: error.message };

  await logAudit("academic_year.set_current", "academic_years", id);
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteAcademicYear(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "settings:write")) return { ok: false, error: "forbidden" };
  if (!profile.schoolId) return { ok: false, error: "no_school" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id)
    .eq("school_id", profile.schoolId);

  if (error) return { ok: false, error: error.message };
  await logAudit("academic_year.delete", "academic_years", id);
  revalidatePath("/settings");
  return { ok: true };
}
