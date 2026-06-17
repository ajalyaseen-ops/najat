"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { classSchema, type ClassInput } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a class. Requires classes:write. RLS also enforces school scope. */
export async function createClass(input: ClassInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "classes:write")) return { ok: false, error: "forbidden" };

  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({ ...parsed.data, school_id: profile.schoolId! })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await logAudit("class.create", "classes", data.id, { name: parsed.data.name });
  revalidatePath("/classes");
  return { ok: true };
}

/** Update an existing class. */
export async function updateClass(id: string, input: ClassInput): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "classes:write")) return { ok: false, error: "forbidden" };

  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("classes").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("class.update", "classes", id);
  revalidatePath("/classes");
  return { ok: true };
}

/** Archive (soft-remove) a class — preserves history. */
export async function archiveClass(id: string): Promise<ActionResult> {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "classes:write")) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("classes").update({ status: "archived" }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit("class.archive", "classes", id);
  revalidatePath("/classes");
  return { ok: true };
}
