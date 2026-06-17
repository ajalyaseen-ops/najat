import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  ClassesTable,
  type ClassRow,
  type GradeLevelOption,
  type AcademicYearOption,
  type StaffOption,
} from "@/features/classes/classes-table";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "classes:read")) redirect("/dashboard");

  const t = await getTranslations("classes");
  const supabase = await createClient();

  const [
    { data: classes },
    { data: gradeLevels },
    { data: academicYears },
    { data: staff },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "id, name, grade_level_id, academic_year_id, capacity, class_teacher_id, student_count, status, grade_levels:grade_level_id(name_ar), staff:class_teacher_id(name_ar)"
      )
      .order("name")
      .limit(1000),
    supabase
      .from("grade_levels")
      .select("id, name_ar")
      .order("sort_order"),
    supabase
      .from("academic_years")
      .select("id, name")
      .order("name", { ascending: false }),
    supabase
      .from("staff")
      .select("id, name_ar")
      .eq("status", "active")
      .order("name_ar"),
  ]);

  const rows: ClassRow[] = (classes ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    grade_level_id: c.grade_level_id,
    academic_year_id: c.academic_year_id,
    capacity: c.capacity,
    class_teacher_id: c.class_teacher_id ?? null,
    student_count: c.student_count ?? 0,
    status: c.status as "active" | "archived",
    gradeLevelName: (c.grade_levels as any)?.name_ar ?? null,
    teacherName: (c.staff as any)?.name_ar ?? null,
  }));

  const gradeLevelOptions: GradeLevelOption[] = (gradeLevels ?? []).map((g: any) => ({
    id: g.id,
    name_ar: g.name_ar,
  }));

  const academicYearOptions: AcademicYearOption[] = (academicYears ?? []).map((y: any) => ({
    id: y.id,
    name: y.name,
  }));

  const staffOptions: StaffOption[] = (staff ?? []).map((s: any) => ({
    id: s.id,
    name_ar: s.name_ar,
  }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle="إدارة الفصول الدراسية والتكليفات" />

      <ClassesTable
        rows={rows}
        gradeLevels={gradeLevelOptions}
        academicYears={academicYearOptions}
        staff={staffOptions}
        canWrite={hasPermission(profile.role, "classes:write")}
      />
    </div>
  );
}
