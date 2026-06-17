import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { StudentsTable, type StudentRow } from "@/features/students/students-table";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "students:read")) redirect("/dashboard");

  const t = await getTranslations("students");
  const tc = await getTranslations("common");
  const supabase = await createClient();

  // Students + their class name. `classes` is joined for the relation label.
  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, name_ar, name_en, gender, ministry_no, civil_id, dob, nationality, guardian_mobile, current_class_id, status, classes:current_class_id(name)"
      )
      .order("name_ar")
      .limit(1000),
    supabase.from("classes").select("id, name").eq("status", "active").order("name"),
  ]);

  const rows: StudentRow[] = (students ?? []).map((s: any) => ({
    ...s,
    className: s.classes?.name ?? null,
  }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Button variant="outline">
          <Download /> {tc("export")}
        </Button>
      </PageHeader>

      <StudentsTable
        rows={rows}
        classes={classes ?? []}
        canWrite={hasPermission(profile.role, "students:write")}
      />
    </div>
  );
}
