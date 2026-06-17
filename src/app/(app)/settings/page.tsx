import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsShell } from "@/features/settings/settings-shell";
import type { AcademicYearRow } from "@/features/settings/academic-tab";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "settings:write")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  const [{ data: school }, { data: academicYears }] = await Promise.all([
    profile.schoolId
      ? supabase
          .from("schools")
          .select("name_ar, name_en, address, phone, email, website, principal_name, calendar")
          .eq("id", profile.schoolId)
          .single()
      : Promise.resolve({ data: null }),

    profile.schoolId
      ? supabase
          .from("academic_years")
          .select("id, name, start_date, end_date, is_current")
          .eq("school_id", profile.schoolId)
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const years: AcademicYearRow[] = (academicYears ?? []).map((y: any) => ({
    id: y.id,
    name: y.name,
    start_date: y.start_date,
    end_date: y.end_date,
    is_current: y.is_current ?? false,
  }));

  const schoolRow = school
    ? {
        name_ar: (school as any).name_ar ?? "",
        name_en: (school as any).name_en ?? null,
        address: (school as any).address ?? null,
        phone: (school as any).phone ?? null,
        email: (school as any).email ?? null,
        website: (school as any).website ?? null,
        principal_name: (school as any).principal_name ?? null,
        calendar: ((school as any).calendar ?? "gregorian") as "gregorian" | "hijri",
      }
    : null;

  return (
    <div>
      <PageHeader title={t("settings")} subtitle="إعدادات المدرسة والسنة الدراسية" />
      <SettingsShell
        school={schoolRow}
        academicYears={years}
        canWrite={hasPermission(profile.role, "settings:write")}
      />
    </div>
  );
}
