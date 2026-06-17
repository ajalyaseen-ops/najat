import { z } from "zod";

export const ACTIVITY_KINDS = [
  "summer_club",
  "camp",
  "competition",
  "sport",
  "trip",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const KIND_LABELS: Record<ActivityKind, string> = {
  summer_club: "نادي صيفي",
  camp: "مخيم",
  competition: "مسابقة",
  sport: "رياضة",
  trip: "رحلة",
};

export const activitySchema = z.object({
  name: z.string().min(2, "اسم النشاط مطلوب"),
  kind: z.enum(ACTIVITY_KINDS).optional().nullable(),
  description: z.string().optional().nullable(),
  supervisor_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  fee: z.coerce.number().min(0).default(0),
  capacity: z.coerce.number().int().positive().optional().nullable(),
});

export type ActivityInput = z.infer<typeof activitySchema>;
