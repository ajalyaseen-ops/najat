import { z } from "zod";

export const ATTENDANCE_STATUSES = ["present", "absent", "excused", "late", "medical"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Single record upsert input */
export const attendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صحيح"),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().optional().nullable(),
});

export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;

/** Bulk upsert input — saves the full roster for a class+date in one action */
export const bulkAttendanceSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(ATTENDANCE_STATUSES),
      note: z.string().optional().nullable(),
    })
  ),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
