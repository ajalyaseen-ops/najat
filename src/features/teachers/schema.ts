import { z } from "zod";

/** Validation for staff/teacher create/update. Shared by the form and server action. */
export const teacherSchema = z.object({
  employee_no: z.string().optional().nullable(),
  name_ar: z.string().min(2, "الاسم مطلوب"),
  name_en: z.string().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  position: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  experience_years: z.coerce.number().int().min(0).optional().nullable(),
  email: z.string().email("بريد غير صحيح").optional().or(z.literal("")).nullable(),
  mobile: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export type TeacherInput = z.infer<typeof teacherSchema>;
