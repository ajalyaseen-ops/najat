import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { pct } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AttendanceTrendChart,
  DepartmentPerformanceChart,
  EnrollmentDonut,
} from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/** Count rows defensively — returns 0 if the table is missing/empty (pre-migration). */
async function safeCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filter?: (q: any) => any
): Promise<number> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const profile = await requireSession();
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  const [students, teachers, classes, presentToday, totalToday] = await Promise.all([
    safeCount(supabase, "students", (q) => q.eq("status", "enrolled")),
    safeCount(supabase, "staff", (q) => q.eq("status", "active")),
    safeCount(supabase, "classes", (q) => q.eq("status", "active")),
    safeCount(supabase, "attendance_records", (q) =>
      q.eq("date", todayISO()).eq("status", "present")
    ),
    safeCount(supabase, "attendance_records", (q) => q.eq("date", todayISO())),
  ]);

  const attendancePct = totalToday > 0 ? pct((presentToday / totalToday) * 100) : 0;

  // Sample series for charts until live history accrues.
  const attendanceTrend = [
    { label: "السبت", pct: 94 },
    { label: "الأحد", pct: 96 },
    { label: "الإثنين", pct: 92 },
    { label: "الثلاثاء", pct: 95 },
    { label: "الأربعاء", pct: 97 },
    { label: "الخميس", pct: 93 },
  ];
  const departmentPerf = [
    { label: "العربية", score: 88 },
    { label: "الرياضيات", score: 82 },
    { label: "العلوم", score: 90 },
    { label: "الإنجليزية", score: 85 },
    { label: "الإسلامية", score: 93 },
  ];
  const enrollment = [
    { label: "الابتدائي", value: 520 },
    { label: "المتوسط", value: 410 },
    { label: "الثانوي", value: 360 },
  ];

  return (
    <div>
      <PageHeader title={t("title")} subtitle={`${t("welcome")}، ${profile.fullName ?? ""}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalStudents")} value={students.toLocaleString()} icon="GraduationCap" tone="primary" />
        <StatCard label={t("totalTeachers")} value={teachers.toLocaleString()} icon="Users" tone="success" />
        <StatCard label={t("totalClasses")} value={classes.toLocaleString()} icon="School" tone="muted" />
        <StatCard
          label={t("attendanceToday")}
          value={`${attendancePct}%`}
          icon="CalendarCheck"
          tone={attendancePct >= 90 ? "success" : "warning"}
          hint={`${presentToday}/${totalToday}`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceTrendChart data={attendanceTrend} />
        </div>
        <EnrollmentDonut data={enrollment} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartmentPerformanceChart data={departmentPerf} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("atRiskStudents")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {/* Populated by the AI at-risk model (see docs/16-ai-features.md). */}
            {t("recentActivity")}…
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
