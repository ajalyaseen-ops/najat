import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  ObservationsTable,
  type ObservationRow,
} from "@/features/observations/observations-table";

export const dynamic = "force-dynamic";

export default async function ObservationsPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "observations:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  const [
    { data: observations },
    { data: staffList },
    { data: classes },
    { data: subjects },
  ] = await Promise.all([
    supabase
      .from("observations")
      .select(
        `id, date, overall_score, status, strengths, improvements, development_plan,
         staff_id, class_id, subject_id,
         staff:staff_id(name_ar),
         classes:class_id(name),
         subjects:subject_id(name_ar)`
      )
      .order("date", { ascending: false })
      .limit(500),
    supabase
      .from("staff")
      .select("id, name_ar")
      .eq("status", "active")
      .order("name_ar"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase.from("subjects").select("id, name_ar").order("name_ar"),
  ]);

  const rows: ObservationRow[] = (observations ?? []).map((o: any) => ({
    id: o.id,
    date: o.date,
    overall_score: o.overall_score ?? null,
    status: o.status as "draft" | "submitted" | "acknowledged",
    strengths: o.strengths ?? null,
    improvements: o.improvements ?? null,
    development_plan: o.development_plan ?? null,
    staff_id: o.staff_id,
    class_id: o.class_id ?? null,
    subject_id: o.subject_id ?? null,
    teacherName: (o.staff as any)?.name_ar ?? null,
    className: (o.classes as any)?.name ?? null,
    subjectName: (o.subjects as any)?.name_ar ?? null,
  }));

  return (
    <div>
      <PageHeader title={t("observations")} subtitle="مراقبة وتقييم أداء المعلمين داخل الفصول الدراسية" />

      <ObservationsTable
        rows={rows}
        staff={(staffList ?? []) as { id: string; name_ar: string }[]}
        classes={(classes ?? []) as { id: string; name: string }[]}
        subjects={(subjects ?? []) as { id: string; name_ar: string }[]}
        canWrite={hasPermission(profile.role, "observations:write")}
      />
    </div>
  );
}
