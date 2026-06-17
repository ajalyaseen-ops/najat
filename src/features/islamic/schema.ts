import { z } from "zod";

/** Validation for quran_memorization create/update. */
export const memorizeSchema = z.object({
  student_id: z.string().uuid("اختر طالبًا"),
  surah_number: z.coerce.number().int().min(1).max(114),
  from_ayah: z.coerce.number().int().min(1).optional().nullable(),
  to_ayah: z.coerce.number().int().min(1).optional().nullable(),
  status: z.enum(["not_started", "in_progress", "memorized"]).default("in_progress"),
  score: z.coerce.number().min(0).max(100).optional().nullable(),
  tajweed_score: z.coerce.number().min(0).max(100).optional().nullable(),
  assessed_at: z.string().optional().nullable(),
});

export type MemorizeInput = z.infer<typeof memorizeSchema>;
