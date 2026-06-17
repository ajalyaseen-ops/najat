"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { announcementSchema, type AnnouncementInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create an announcement. Requires communication:send. RLS enforces school scope. */
export async function createAnnouncement(input: AnnouncementInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "communication:send"))
    return { ok: false, error: "forbidden" };

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      ...parsed.data,
      school_id: profile.schoolId!,
      created_by: profile.id,
      published_at: parsed.data.published_at ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("announcement.create", "announcements", data.id, { title: parsed.data.title });
  revalidatePath("/communication");
  return { ok: true };
}

/** Delete an announcement. Requires communication:send. */
export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "communication:send"))
    return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("announcement.delete", "announcements", id);
  revalidatePath("/communication");
  return { ok: true };
}
