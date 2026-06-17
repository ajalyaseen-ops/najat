import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  CurriculumTracker,
  type PlanRow,
  type UnitRow,
  type LessonRow,
  type CoverageRow,
} from "@/features/curriculum/curriculum-tracker";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "curriculum:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  const [
    { data: rawPlans },
    { data: rawUnits },
    { data: rawLessons },
    { data: rawCoverage },
    { data: rawClasses },
    { data: rawSubjects },
    { data: rawGrades },
    { data: rawYears },
  ] = await Promise.all([
    supabase
      .from("curriculum_plans")
      .select(
        "id, title, subjects:subject_id(name_ar), grade_levels:grade_level_id(name_ar), academic_years:academic_year_id(name)"
      )
      .order("title"),
    supabase.from("curriculum_units").select("id, plan_id, title, sort_order").order("sort_order"),
    supabase
      .from("curriculum_lessons")
      .select("id, unit_id, title, outcomes, planned_date, sort_order")
      .order("sort_order"),
    supabase
      .from("curriculum_coverage")
      .select("lesson_id, class_id, status, covered_on")
      .eq("school_id", profile.schoolId ?? ""),
    supabase
      .from("classes")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase.from("subjects").select("id, name_ar").order("name_ar"),
    supabase.from("grade_levels").select("id, name_ar").order("name_ar"),
    supabase.from("academic_years").select("id, name").order("name"),
  ]);

  const plans: PlanRow[] = (rawPlans ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    subject_name: p.subjects?.name_ar ?? "—",
    grade_name: p.grade_levels?.name_ar ?? null,
    year_name: p.academic_years?.name ?? null,
  }));

  const units: UnitRow[] = (rawUnits ?? []).map((u: any) => ({
    id: u.id,
    plan_id: u.plan_id,
    title: u.title,
    sort_order: u.sort_order,
  }));

  const lessons: LessonRow[] = (rawLessons ?? []).map((l: any) => ({
    id: l.id,
    unit_id: l.unit_id,
    title: l.title,
    outcomes: l.outcomes ?? null,
    planned_date: l.planned_date ?? null,
    sort_order: l.sort_order,
  }));

  const coverageRows: CoverageRow[] = (rawCoverage ?? []).map((c: any) => ({
    lesson_id: c.lesson_id,
    class_id: c.class_id,
    status: c.status,
    covered_on: c.covered_on ?? null,
  }));

  return (
    <div>
      <PageHeader
        title={t("curriculum")}
        subtitle="تتبع تغطية وحدات ودروس المنهج الدراسي لكل فصل"
      />

      <CurriculumTracker
        plans={plans}
        units={units}
        lessons={lessons}
        coverageRows={coverageRows}
        classes={rawClasses ?? []}
        subjects={(rawSubjects ?? []).map((s: any) => ({ id: s.id, name_ar: s.name_ar }))}
        gradeLevels={(rawGrades ?? []).map((g: any) => ({ id: g.id, name_ar: g.name_ar }))}
        academicYears={(rawYears ?? []).map((y: any) => ({ id: y.id, name: y.name }))}
        canWrite={hasPermission(profile.role, "curriculum:write")}
      />
    </div>
  );
}
