import { z } from "zod";

/** Validation for timetable_slots create/update. */
export const timetableSlotSchema = z.object({
  class_id: z.string().uuid("الفصل مطلوب"),
  period_id: z.string().uuid("الحصة مطلوبة"),
  day_of_week: z.coerce.number().int().min(0).max(6),
  subject_id: z.string().uuid().optional().nullable(),
  staff_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
});

export type TimetableSlotInput = z.infer<typeof timetableSlotSchema>;
