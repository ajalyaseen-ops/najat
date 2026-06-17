import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { TeachersTable, type TeacherRow } from "@/features/teachers/teachers-table";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "teachers:read")) redirect("/dashboard");

  const t = await getTranslations("teachers");
  const tc = await getTranslations("common");
  const supabase = await createClient();

  // Staff + their department name, plus teaching assignment count as a hint.
  const [{ data: staff }, { data: departments }, { data: assignments }] = await Promise.all([
    supabase
      .from("staff")
      .select(
        "id, employee_no, name_ar, name_en, department_id, position, qualifications, experience_years, email, mobile, hire_date, status, departments:department_id(name_ar, name_en)"
      )
      .order("name_ar")
      .limit(1000),
    supabase
      .from("departments")
      .select("id, name_ar, name_en")
      .order("name_ar"),
    supabase
      .from("teaching_assignments")
      .select("staff_id"),
  ]);

  // Build a teaching-load count per staff member.
  const loadMap: Record<string, number> = {};
  for (const a of assignments ?? []) {
    const sid = (a as any).staff_id as string;
    loadMap[sid] = (loadMap[sid] ?? 0) + 1;
  }

  const rows: TeacherRow[] = (staff ?? []).map((s: any) => ({
    id: s.id,
    employee_no: s.employee_no ?? null,
    name_ar: s.name_ar,
    name_en: s.name_en ?? null,
    department_id: s.department_id ?? null,
    position: s.position ?? null,
    qualifications: s.qualifications ?? null,
    experience_years: s.experience_years ?? null,
    email: s.email ?? null,
    mobile: s.mobile ?? null,
    hire_date: s.hire_date ?? null,
    status: s.status ?? "active",
    departmentName: (s.departments as any)?.name_ar ?? null,
    teachingLoad: loadMap[s.id] ?? 0,
  }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Button variant="outline">
          <Download /> {tc("export")}
        </Button>
      </PageHeader>

      <TeachersTable
        rows={rows}
        departments={(departments ?? []) as { id: string; name_ar: string; name_en: string | null }[]}
        canWrite={hasPermission(profile.role, "teachers:write")}
      />
    </div>
  );
}
