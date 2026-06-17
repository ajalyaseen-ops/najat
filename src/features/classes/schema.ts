import { z } from "zod";

/** Validation for class create/update. Shared by the form and server action. */
export const classSchema = z.object({
  name: z.string().min(1, "اسم الفصل مطلوب"),
  grade_level_id: z.string().uuid("يجب اختيار الصف الدراسي"),
  academic_year_id: z.string().uuid("يجب اختيار السنة الدراسية"),
  capacity: z.coerce.number().int().min(1, "السعة يجب أن تكون 1 على الأقل").default(42),
  class_teacher_id: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "archived"]).default("active"),
});

export type ClassInput = z.infer<typeof classSchema>;
