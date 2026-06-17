import { z } from "zod";

export const coverageStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
export type CoverageStatus = z.infer<typeof coverageStatusSchema>;

export const upsertCoverageSchema = z.object({
  lesson_id: z.string().uuid("معرف الدرس غير صحيح"),
  class_id: z.string().uuid("معرف الفصل غير صحيح"),
  status: coverageStatusSchema,
  covered_on: z.string().optional().nullable(),
});
export type UpsertCoverageInput = z.infer<typeof upsertCoverageSchema>;

export const createPlanSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  subject_id: z.string().uuid("المادة مطلوبة"),
  grade_level_id: z.string().uuid().optional().nullable(),
  academic_year_id: z.string().uuid().optional().nullable(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
