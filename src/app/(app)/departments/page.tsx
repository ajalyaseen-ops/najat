import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  DepartmentsTable,
  type DepartmentRow,
  type StaffOption,
} from "@/features/departments/departments-table";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "departments:read")) redirect("/dashboard");

  const t = await getTranslations("departments");
  const supabase = await createClient();

  // Fetch departments, staff for head picker, and subject counts in parallel.
  const [{ data: departments }, { data: staffRows }, { data: subjectRows }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name_ar, name_en, head_id, head:head_id(name_ar)")
      .order("name_ar")
      .limit(500),
    supabase
      .from("staff")
      .select("id, name_ar, department_id")
      .eq("status", "active")
      .order("name_ar")
      .limit(500),
    supabase.from("subjects").select("id, department_id").limit(2000),
  ]);

  // Build lookup maps for counts
  const staffCountByDept: Record<string, number> = {};
  for (const s of staffRows ?? []) {
    if (s.department_id) {
      staffCountByDept[s.department_id] = (staffCountByDept[s.department_id] ?? 0) + 1;
    }
  }

  const subjectCountByDept: Record<string, number> = {};
  for (const sub of subjectRows ?? []) {
    if (sub.department_id) {
      subjectCountByDept[sub.department_id] = (subjectCountByDept[sub.department_id] ?? 0) + 1;
    }
  }

  const rows: DepartmentRow[] = (departments ?? []).map((d: any) => ({
    id: d.id,
    name_ar: d.name_ar,
    name_en: d.name_en ?? null,
    head_id: d.head_id ?? null,
    headName: d.head?.name_ar ?? null,
    staffCount: staffCountByDept[d.id] ?? 0,
    subjectCount: subjectCountByDept[d.id] ?? 0,
  }));

  // Staff list for the head_id selector in the form (id + display name)
  const staffOptions: StaffOption[] = (staffRows ?? []).map((s: any) => ({
    id: s.id,
    name: s.name_ar,
  }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle="إدارة الأقسام الأكاديمية وتعيين رؤساء الأقسام" />
      <DepartmentsTable
        rows={rows}
        staff={staffOptions}
        canWrite={hasPermission(profile.role, "departments:write")}
      />
    </div>
  );
}
