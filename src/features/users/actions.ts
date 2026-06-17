"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { changeRoleSchema, type ChangeRoleInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Change a user's role within the current school.
 * Requires users:manage permission. RLS enforces school scope.
 */
export async function changeUserRole(input: ChangeRoleInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "users:manage")) {
    return { ok: false, error: "forbidden" };
  }

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  // Prevent demoting oneself (safety guard)
  if (parsed.data.profileId === profile.id) {
    return { ok: false, error: "لا يمكنك تغيير دورك الخاص" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.profileId);

  if (error) return { ok: false, error: error.message };

  await logAudit("user.changeRole", "profiles", parsed.data.profileId, {
    newRole: parsed.data.role,
  });

  revalidatePath("/users");
  return { ok: true };
}
