import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  GradesClient,
  type ClassOption,
  type SubjectOption,
  type AssessmentTypeOption,
  type AssessmentRow,
  type StudentGradeRow,
} from "@/features/grades/grades-client";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "grades:read")) redirect("/dashboard");

  const t = await getTranslations("grades");
  const supabase = await createClient();

  // ── Reference data ──────────────────────────────────────────────────────────

  const [
    { data: rawClasses },
    { data: rawSubjects },
    { data: rawAssessmentTypes },
    { data: rawAssessments },
    { data: rawStudents },
    { data: rawGrades },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("status", "active")
      .order("name"),

    supabase
      .from("subjects")
      .select("id, name_ar, code")
      .order("name_ar"),

    supabase
      .from("assessment_types")
      .select("id, name_ar, weight, max_score")
      .order("sort_order"),

    supabase
      .from("assessments")
      .select(
        "id, title, max_score, date, term, class_id, subject_id, assessment_type_id, assessment_types(name_ar, weight)"
      )
      .order("date", { ascending: true }),

    supabase
      .from("students")
      .select("id, name_ar, current_class_id")
      .eq("status", "enrolled")
      .order("name_ar"),

    supabase
      .from("grades")
      .select("assessment_id, student_id, score"),
  ]);

  // ── Shape data ──────────────────────────────────────────────────────────────

  const classes: ClassOption[] = (rawClasses ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
  }));

  const subjects: SubjectOption[] = (rawSubjects ?? []).map((s: any) => ({
    id: s.id,
    name_ar: s.name_ar,
    code: s.code,
  }));

  const assessmentTypes: AssessmentTypeOption[] = (rawAssessmentTypes ?? []).map((at: any) => ({
    id: at.id,
    name_ar: at.name_ar,
    weight: at.weight ?? 0,
    max_score: at.max_score ?? 100,
  }));

  // Assessments: keep extra fields (class_id, subject_id) for client-side filter
  const allAssessments = (rawAssessments ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    max_score: a.max_score,
    date: a.date ?? null,
    term: a.term ?? 1,
    class_id: a.class_id,
    subject_id: a.subject_id,
    assessment_type_id: a.assessment_type_id ?? null,
    assessment_types: a.assessment_types
      ? { name_ar: (a.assessment_types as any).name_ar, weight: (a.assessment_types as any).weight ?? 0 }
      : null,
  })) as (AssessmentRow & { class_id: string; subject_id: string })[];

  // Build grades lookup: student_id → assessment_id → score
  const gradesLookup: Record<string, Record<string, number | null>> = {};
  for (const g of rawGrades ?? []) {
    const gr = g as any;
    if (!gradesLookup[gr.student_id]) gradesLookup[gr.student_id] = {};
    gradesLookup[gr.student_id][gr.assessment_id] = gr.score ?? null;
  }

  // Build student rows, keeping class_id for client filtering
  const allStudentGrades: (StudentGradeRow & { class_id: string | null })[] = (
    rawStudents ?? []
  ).map((s: any) => ({
    student_id: s.id,
    student_name: s.name_ar,
    class_id: s.current_class_id ?? null,
    scores: gradesLookup[s.id] ?? {},
  }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle="دفتر الدرجات — اختر الفصل والمادة للبدء">
      </PageHeader>

      <GradesClient
        classes={classes}
        subjects={subjects}
        assessmentTypes={assessmentTypes}
        allAssessments={allAssessments as any}
        allStudentGrades={allStudentGrades as any}
        canWrite={hasPermission(profile.role, "grades:write")}
      />
    </div>
  );
}
