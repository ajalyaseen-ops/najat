import { z } from "zod";

/** Validation for student create/update. Shared by the form and server action. */
export const studentSchema = z.object({
  name_ar: z.string().min(2, "الاسم مطلوب"),
  name_en: z.string().optional().nullable(),
  gender: z.enum(["male", "female"]),
  student_no: z.string().optional().nullable(),
  ministry_no: z.string().optional().nullable(),
  civil_id: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  medical_notes: z.string().optional().nullable(),
  enrollment_date: z.string().optional().nullable(),
  emergency_contact: z.string().optional().nullable(),
  father_name: z.string().optional().nullable(),
  mother_name: z.string().optional().nullable(),
  guardian_name: z.string().optional().nullable(),
  guardian_mobile: z.string().optional().nullable(),
  guardian_email: z.string().email("بريد غير صحيح").optional().or(z.literal("")).nullable(),
  guardian_occupation: z.string().optional().nullable(),
  current_class_id: z.string().uuid().optional().nullable(),
  status: z
    .enum(["enrolled", "transferred", "withdrawn", "graduated", "archived"])
    .default("enrolled"),
});

export type StudentInput = z.infer<typeof studentSchema>;
