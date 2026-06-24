import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { DepartmentSwitcher } from "@/features/staffing/department-switcher";
import {
  StaffingGrid,
  type GradeCol,
  type TeacherRow,
  type Alloc,
} from "@/features/staffing/staffing-grid";

export const dynamic = "force-dynamic";

export default async function StaffingPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "staffing:read")) redirect("/dashboard");

  const t = await getTranslations("staffing");
  const supabase = await createClient();

  // The staffing plan targets the most recent academic year on file.
  const { data: yearRow } = await supabase
    .from("academic_years")
    .select("id, name")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { dept: deptParam } = await searchParams;

  const { data: deptsRaw } = await supabase
    .from("departments")
    .select("id, name_ar, periods_per_class" as any)
    .order("name_ar");
  const departments = (deptsRaw ?? []) as unknown as {
    id: string;
    name_ar: string;
    periods_per_class: number;
  }[];

  const selectedDept =
    (deptParam && departments.find((d) => d.id === deptParam)) || departments[0] || null;

  if (!yearRow || !selectedDept) {
    return (
      <div>
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="rounded-xl border bg-card py-20 text-center text-muted-foreground">
          {t("noDepartments")}
        </div>
      </div>
    );
  }

  // Classes for the plan year + their grade levels, and the dept's teachers + allocations.
  const [{ data: gradesRaw }, { data: classesRaw }, { data: staffRaw }, { data: allocRaw }] =
    await Promise.all([
      supabase.from("grade_levels").select("id, name_ar, sort_order").order("sort_order"),
      supabase
        .from("classes")
        .select("id, name, grade_level_id")
        .eq("academic_year_id", yearRow.id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("staff")
        .select("id, name_ar, nisab, exempt_periods, role_tags" as any)
        .eq("department_id", selectedDept.id)
        .eq("status", "active")
        .order("name_ar"),
      supabase
        .from("staffing_allocations" as any)
        .select("staff_id, class_id, periods")
        .eq("department_id", selectedDept.id)
        .eq("academic_year_id", yearRow.id),
    ]);

  const gradeOrder = new Map(
    ((gradesRaw ?? []) as { id: string; name_ar: string; sort_order: number }[]).map((g) => [
      g.id,
      { name: g.name_ar, sort: g.sort_order },
    ])
  );

  // Build grade columns from the classes that exist this year, ordered by grade.
  const byGrade = new Map<string, { id: string; name: string }[]>();
  for (const c of (classesRaw ?? []) as { id: string; name: string; grade_level_id: string }[]) {
    (byGrade.get(c.grade_level_id) ?? byGrade.set(c.grade_level_id, []).get(c.grade_level_id)!).push({
      id: c.id,
      name: c.name,
    });
  }
  const grades: GradeCol[] = [...byGrade.entries()]
    .map(([gid, classes]) => ({
      id: gid,
      name: gradeOrder.get(gid)?.name ?? "",
      sort: gradeOrder.get(gid)?.sort ?? 999,
      classes,
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, name, classes }) => ({ id, name, classes }));

  const teachers: TeacherRow[] = (
    (staffRaw ?? []) as unknown as {
      id: string;
      name_ar: string;
      nisab: number | null;
      exempt_periods: number | null;
      role_tags: string[] | null;
    }[]
  ).map((s) => ({
    id: s.id,
    name: s.name_ar,
    nisab: s.nisab ?? 18,
    exempt: s.exempt_periods ?? 0,
    roleTags: s.role_tags ?? [],
  }));

  const allocations = ((allocRaw ?? []) as unknown as Alloc[]).map((a) => ({
    staff_id: a.staff_id,
    class_id: a.class_id,
    periods: a.periods,
  }));

  const canWrite = hasPermission(profile.role, "staffing:write");
  const deptOptions = departments.map((d) => ({ id: d.id, name: d.name_ar }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle={`${t("subtitle")} — ${yearRow.name}`}>
        <Suspense fallback={null}>
          <DepartmentSwitcher
            departments={deptOptions}
            selectedId={selectedDept.id}
            label={t("department")}
          />
        </Suspense>
      </PageHeader>

      {teachers.length === 0 ? (
        <div className="rounded-xl border bg-card py-20 text-center text-muted-foreground">
          {t("noTeachers")}
        </div>
      ) : (
        <StaffingGrid
          departmentId={selectedDept.id}
          academicYearId={yearRow.id}
          periodsPerClass={selectedDept.periods_per_class ?? 0}
          grades={grades}
          teachers={teachers}
          allocations={allocations}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
