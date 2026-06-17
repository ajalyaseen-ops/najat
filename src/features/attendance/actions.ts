"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  bulkAttendanceSchema,
  attendanceRecordSchema,
  type BulkAttendanceInput,
  type AttendanceRecordInput,
} from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Upsert attendance for ALL students in a class on a given date.
 * The unique constraint is (student_id, date) — use ON CONFLICT to upsert.
 */
export async function saveAttendance(input: BulkAttendanceInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "attendance:write"))
    return { ok: false, error: "forbidden" };

  const parsed = bulkAttendanceSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const { class_id, date, records } = parsed.data;

  if (!profile.schoolId) return { ok: false, error: "no-school" };

  const rows = records.map((r) => ({
    school_id: profile.schoolId!,
    class_id,
    date,
    student_id: r.student_id,
    status: r.status,
    note: r.note ?? null,
    recorded_by: profile.id,
  }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "student_id,date", ignoreDuplicates: false });

  if (error) return { ok: false, error: error.message };

  await logAudit("attendance.bulk_save", "attendance_records", null, {
    class_id,
    date,
    count: rows.length,
  });
  revalidatePath("/attendance");
  return { ok: true };
}

/**
 * Upsert a single attendance record (quick status toggle).
 */
export async function saveOneAttendance(input: AttendanceRecordInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "attendance:write"))
    return { ok: false, error: "forbidden" };

  const parsed = attendanceRecordSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  if (!profile.schoolId) return { ok: false, error: "no-school" };

  const supabase = await createClient();
  const { error } = await supabase.from("attendance_records").upsert(
    {
      school_id: profile.schoolId,
      class_id: parsed.data.class_id,
      date: parsed.data.date,
      student_id: parsed.data.student_id,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
      recorded_by: profile.id,
    },
    { onConflict: "student_id,date", ignoreDuplicates: false }
  );

  if (error) return { ok: false, error: error.message };

  await logAudit("attendance.save_one", "attendance_records", parsed.data.student_id, {
    date: parsed.data.date,
    status: parsed.data.status,
  });
  revalidatePath("/attendance");
  return { ok: true };
}

/**
 * Mark all students in a class as "present" for a given date.
 */
export async function markAllPresent(class_id: string, date: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "attendance:write"))
    return { ok: false, error: "forbidden" };

  if (!profile.schoolId) return { ok: false, error: "no-school" };

  const supabase = await createClient();

  // Fetch all students in the class
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("current_class_id", class_id)
    .eq("status", "enrolled");

  if (studentsError) return { ok: false, error: studentsError.message };
  if (!students || students.length === 0) return { ok: true };

  const rows = students.map((s) => ({
    school_id: profile.schoolId!,
    class_id,
    date,
    student_id: s.id,
    status: "present" as const,
    note: null,
    recorded_by: profile.id,
  }));

  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "student_id,date", ignoreDuplicates: false });

  if (error) return { ok: false, error: error.message };

  await logAudit("attendance.mark_all_present", "attendance_records", null, {
    class_id,
    date,
    count: rows.length,
  });
  revalidatePath("/attendance");
  return { ok: true };
}
