import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { ReportCatalog, type ReportStats } from "@/features/reports/report-catalog";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "reports:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  // Gather high-level stats shown in the KPI strip at the top of the page.
  // Each query is wrapped so a missing table / empty result defaults safely.
  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalClasses },
    { count: presentToday },
    { count: totalEnrollmentsToday },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "enrolled")
      .then((r) => ({ count: r.count ?? 0 }))
      .catch(() => ({ count: 0 })),

    supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then((r) => ({ count: r.count ?? 0 }))
      .catch(() => ({ count: 0 })),

    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then((r) => ({ count: r.count ?? 0 }))
      .catch(() => ({ count: 0 })),

    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("status", "present")
      .eq("date", new Date().toISOString().slice(0, 10))
      .then((r) => ({ count: r.count ?? 0 }))
      .catch(() => ({ count: 0 })),

    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("date", new Date().toISOString().slice(0, 10))
      .then((r) => ({ count: r.count ?? 0 }))
      .catch(() => ({ count: 0 })),
  ]);

  const stats: ReportStats = {
    totalStudents: totalStudents as number,
    totalTeachers: totalTeachers as number,
    totalClasses: totalClasses as number,
    attendanceToday: presentToday as number,
    attendanceTodayTotal: totalEnrollmentsToday as number,
  };

  return (
    <div>
      <PageHeader
        title={t("reports")}
        subtitle="استعرض التقارير الأكاديمية والإدارية للمدرسة"
      />
      <ReportCatalog stats={stats} />
    </div>
  );
}
