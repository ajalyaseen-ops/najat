import { z } from "zod";

export const behaviorSchema = z.object({
  student_id: z.string().uuid("اختر طالباً"),
  kind: z.enum(["positive", "negative"]),
  category: z.string().min(1, "الفئة مطلوبة"),
  description: z.string().optional().nullable(),
  action_taken: z.string().optional().nullable(),
  date: z.string().min(1, "التاريخ مطلوب"),
  points: z.coerce.number().int().default(0),
});

export type BehaviorInput = z.infer<typeof behaviorSchema>;
