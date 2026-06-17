import { z } from "zod";

/** General school info. */
export const schoolGeneralSchema = z.object({
  name_ar: z.string().min(2, "اسم المدرسة مطلوب"),
  name_en: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("بريد غير صحيح").optional().or(z.literal("")).nullable(),
  website: z.string().optional().nullable(),
  principal_name: z.string().optional().nullable(),
});

export type SchoolGeneralInput = z.infer<typeof schoolGeneralSchema>;

/** Calendar preference. */
export const schoolCalendarSchema = z.object({
  calendar: z.enum(["gregorian", "hijri"]),
});

export type SchoolCalendarInput = z.infer<typeof schoolCalendarSchema>;

/** Academic year create. */
export const academicYearSchema = z.object({
  name: z.string().min(2, "اسم العام مطلوب"),
  start_date: z.string().min(1, "تاريخ البداية مطلوب"),
  end_date: z.string().min(1, "تاريخ النهاية مطلوب"),
});

export type AcademicYearInput = z.infer<typeof academicYearSchema>;
