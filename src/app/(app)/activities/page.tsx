import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  ActivitiesGrid,
  type ActivityRow,
} from "@/features/activities/activities-grid";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "activities:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  const [{ data: activities }, { data: participants }, { data: staff }] =
    await Promise.all([
      supabase
        .from("activities")
        .select(
          "id, name, kind, description, supervisor_id, start_date, end_date, fee, capacity, staff:supervisor_id(full_name)"
        )
        .order("start_date", { ascending: false })
        .limit(500),
      supabase
        .from("activity_participants")
        .select("activity_id"),
      supabase
        .from("staff")
        .select("id, full_name")
        .order("full_name"),
    ]);

  // Count participants per activity
  const countMap = new Map<string, number>();
  for (const p of participants ?? []) {
    const prev = countMap.get(p.activity_id) ?? 0;
    countMap.set(p.activity_id, prev + 1);
  }

  const rows: ActivityRow[] = (activities ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    kind: a.kind ?? null,
    description: a.description ?? null,
    supervisor_id: a.supervisor_id ?? null,
    start_date: a.start_date ?? null,
    end_date: a.end_date ?? null,
    fee: a.fee ?? 0,
    capacity: a.capacity ?? null,
    participantCount: countMap.get(a.id) ?? 0,
    supervisorName: (a.staff as any)?.full_name ?? null,
  }));

  const supervisors = (staff ?? []).map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
  }));

  return (
    <div>
      <PageHeader
        title={t("activities")}
        subtitle={`${rows.length} نشاط مسجل`}
      />
      <ActivitiesGrid
        rows={rows}
        supervisors={supervisors}
        canWrite={hasPermission(profile.role, "activities:write")}
      />
    </div>
  );
}
