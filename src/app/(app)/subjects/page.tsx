import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { SubjectsTable, type SubjectRow } from "@/features/subjects/subjects-table";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "subjects:read")) redirect("/dashboard");

  const t = await getTranslations("subjects");
  const supabase = await createClient();

  const [{ data: subjects }, { data: departments }] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, name_ar, name_en, code, department_id, weekly_periods, departments:department_id(name_ar, name_en)"
      )
      .order("name_ar")
      .limit(1000),
    supabase.from("departments").select("id, name_ar, name_en").order("name_ar"),
  ]);

  const rows: SubjectRow[] = (subjects ?? []).map((s: any) => ({
    id: s.id,
    name_ar: s.name_ar,
    name_en: s.name_en ?? null,
    code: s.code,
    department_id: s.department_id ?? null,
    weekly_periods: s.weekly_periods,
    departmentName: s.departments?.name_ar ?? null,
  }));

  const deptOptions = (departments ?? []).map((d: any) => ({
    id: d.id,
    name: d.name_ar,
  }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle="إدارة المواد الدراسية للمدرسة" />

      <SubjectsTable
        rows={rows}
        departments={deptOptions}
        canWrite={hasPermission(profile.role, "subjects:write")}
      />
    </div>
  );
}
