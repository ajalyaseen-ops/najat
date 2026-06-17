import { z } from "zod";

export const observationSchema = z.object({
  staff_id: z.string().uuid("يرجى اختيار المعلم"),
  class_id: z.string().uuid().optional().nullable(),
  subject_id: z.string().uuid().optional().nullable(),
  date: z.string().min(1, "التاريخ مطلوب"),
  overall_score: z.coerce.number().min(0).max(100).optional().nullable(),
  strengths: z.string().optional().nullable(),
  improvements: z.string().optional().nullable(),
  development_plan: z.string().optional().nullable(),
  status: z.enum(["draft", "submitted", "acknowledged"]).default("draft"),
});

export type ObservationInput = z.infer<typeof observationSchema>;
