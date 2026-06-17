import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

/**
 * Append an entry to the audit trail. Best-effort: never throws into the
 * calling action (an audit failure must not block the user's operation).
 * The DB also keeps an immutable trigger-based log; this captures app intent.
 */
export async function logAudit(
  action: string,
  entity?: string,
  entityId?: string | number | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const profile = await getSessionProfile();
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      school_id: profile?.schoolId ?? null,
      user_id: profile?.id ?? null,
      user_email: profile?.email ?? null,
      action,
      entity: entity ?? null,
      entity_id: entityId != null ? String(entityId) : null,
      meta: meta ?? null,
    });
  } catch {
    // swallow — auditing is non-blocking
  }
}
