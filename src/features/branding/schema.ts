import { z } from "zod";

/** HSL string validator: e.g. "218 64% 23%" */
const hslString = z
  .string()
  .optional()
  .nullable()
  .refine(
    (v) =>
      !v ||
      /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(v.trim()),
    { message: "صيغة HSL غير صحيحة — مثال: 218 64% 23%" }
  );

export const brandingSchema = z.object({
  name_ar: z.string().min(2, "اسم المدرسة بالعربي مطلوب"),
  name_en: z.string().optional().nullable(),
  slogan_ar: z.string().optional().nullable(),
  logo_url: z.string().url("رابط غير صحيح").optional().or(z.literal("")).nullable(),
  stamp_url: z.string().url("رابط غير صحيح").optional().or(z.literal("")).nullable(),
  signature_url: z.string().url("رابط غير صحيح").optional().or(z.literal("")).nullable(),
  theme_primary: hslString,
  theme_secondary: hslString,
});

export type BrandingInput = z.infer<typeof brandingSchema>;
