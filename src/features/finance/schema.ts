import { z } from "zod";

/** Validation for creating a fee structure. */
export const feeStructureSchema = z.object({
  name: z.string().min(2, "اسم هيكل الرسوم مطلوب"),
  amount: z.coerce.number().min(0, "المبلغ لا يمكن أن يكون سالباً"),
  grade_level_id: z.string().uuid().optional().nullable(),
  academic_year_id: z.string().uuid().optional().nullable(),
});

export type FeeStructureInput = z.infer<typeof feeStructureSchema>;
