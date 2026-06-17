"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { brandingSchema, type BrandingInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Update the current school's branding fields.
 * Requires branding:write. RLS limits the update to the user's own school.
 */
export async function saveBranding(input: BrandingInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "branding:write")) {
    return { ok: false, error: "forbidden" };
  }
  if (!profile.schoolId) {
    return { ok: false, error: "لا يوجد مدرسة مرتبطة بالحساب" };
  }

  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const { theme_primary, theme_secondary, ...rest } = parsed.data;

  // Build the theme JSONB patch (only include keys that were supplied).
  const theme: Record<string, string> = {};
  if (theme_primary) theme["--primary"] = theme_primary.trim();
  if (theme_secondary) theme["--secondary"] = theme_secondary.trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({
      ...rest,
      ...(Object.keys(theme).length > 0 ? { theme } : {}),
    })
    .eq("id", profile.schoolId);

  if (error) return { ok: false, error: error.message };

  await logAudit("branding.save", "schools", profile.schoolId, {
    name: parsed.data.name_ar,
  });
  revalidatePath("/branding");
  return { ok: true };
}
