import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { AuditLogTable, type AuditLogRow } from "@/features/audit/audit-log-table";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "audit:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_logs")
    .select("id, created_at, user_email, action, entity, entity_id, meta")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: AuditLogRow[] = (data ?? []).map((r: any) => ({
    id: r.id as number,
    created_at: r.created_at as string,
    user_email: r.user_email ?? null,
    action: r.action as string,
    entity: r.entity ?? null,
    entity_id: r.entity_id ?? null,
    meta: r.meta ?? null,
  }));

  return (
    <div>
      <PageHeader
        title={t("auditLog")}
        subtitle="آخر 200 إجراء مسجّل في النظام"
      />

      <AuditLogTable rows={rows} />
    </div>
  );
}
