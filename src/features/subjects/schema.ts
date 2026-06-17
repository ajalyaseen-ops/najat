import { z } from "zod";

/** Validation for subject create/update. Shared by the form and server action. */
export const subjectSchema = z.object({
  name_ar: z.string().min(2, "اسم المادة مطلوب"),
  name_en: z.string().optional().nullable(),
  code: z.string().min(1, "رمز المادة مطلوب"),
  department_id: z.string().uuid().optional().nullable(),
  weekly_periods: z.coerce.number().int().min(1, "يجب أن تكون الحصص الأسبوعية رقماً موجباً").default(1),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
