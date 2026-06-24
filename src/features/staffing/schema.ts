import { z } from "zod";

/** Upsert a single cell: how many periods a teacher gives one class. */
export const allocationSchema = z.object({
  staff_id: z.string().uuid(),
  class_id: z.string().uuid(),
  department_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  periods: z.coerce.number().int().min(0).max(40),
});
export type AllocationInput = z.infer<typeof allocationSchema>;

/** Edit a teacher's plan meta (load target + non-teaching periods + role tags). */
export const staffPlanSchema = z.object({
  nisab: z.coerce.number().int().min(0).max(40),
  exempt_periods: z.coerce.number().int().min(0).max(40),
  role_tags: z.array(z.string()).max(8).optional(),
});
export type StaffPlanInput = z.infer<typeof staffPlanSchema>;

/** Known role tags used in the staffing sheet's notes column. */
export const ROLE_TAGS = [
  "head",
  "wing_supervisor",
  "subject_supervisor",
  "school_assigned",
  "studies",
  "tech_coordinator",
  "full_time",
  "assistant_supervisor",
] as const;
export type RoleTag = (typeof ROLE_TAGS)[number];
