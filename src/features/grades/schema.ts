import { z } from "zod";

/** Zod schema for upserting a grade (score) for a student on an assessment. */
export const gradeUpsertSchema = z.object({
  assessment_id: z.string().uuid("معرف التقييم مطلوب"),
  student_id: z.string().uuid("معرف الطالب مطلوب"),
  score: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0, "الدرجة لا يمكن أن تكون سالبة").nullable()
  ),
  note: z.string().optional().nullable(),
});

export type GradeUpsertInput = z.infer<typeof gradeUpsertSchema>;

/** Zod schema for bulk-saving grades (list of upserts). */
export const gradesBulkSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  term: z.number().int().min(1).max(4),
  grades: z.array(gradeUpsertSchema),
});

export type GradesBulkInput = z.infer<typeof gradesBulkSchema>;

/** Zod schema for creating a new assessment. */
export const assessmentCreateSchema = z.object({
  class_id: z.string().uuid("الفصل مطلوب"),
  subject_id: z.string().uuid("المادة مطلوبة"),
  assessment_type_id: z.string().uuid().optional().nullable(),
  term: z.number().int().min(1).max(4).default(1),
  title: z.string().min(2, "العنوان مطلوب"),
  max_score: z.preprocess(
    (v) => Number(v),
    z.number().positive("الدرجة القصوى يجب أن تكون أكبر من صفر")
  ),
  date: z.string().optional().nullable(),
});

export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;
