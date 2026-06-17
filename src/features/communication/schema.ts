import { z } from "zod";

export const AUDIENCE_OPTIONS = ["all", "teachers", "parents", "students"] as const;
export type Audience = (typeof AUDIENCE_OPTIONS)[number];

export const announcementSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  body: z.string().optional().nullable(),
  audience: z.enum(AUDIENCE_OPTIONS).default("all"),
  published_at: z.string().optional().nullable(),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
