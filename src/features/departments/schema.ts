import { z } from "zod";

/** Validation schema for department create/update. Shared by the form and server action. */
export const departmentSchema = z.object({
  name_ar: z.string().min(2, "اسم القسم مطلوب"),
  name_en: z.string().optional().nullable(),
  head_id: z.string().uuid().optional().nullable(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
