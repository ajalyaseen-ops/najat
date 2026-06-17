import { z } from "zod";
import { ROLES } from "@/lib/rbac";

export const changeRoleSchema = z.object({
  profileId: z.string().uuid("معرّف غير صالح"),
  role: z.enum(ROLES, { required_error: "الدور مطلوب" }),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
