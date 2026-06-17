import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  MemorizationTable,
  type MemorizationRow,
} from "@/features/islamic/memorization-table";
import type { StudentOption } from "@/features/islamic/memorization-form";

export const dynamic = "force-dynamic";

export default async function IslamicPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "islamic:read")) redirect("/dashboard");

  const t = await getTranslations("islamic");
  const supabase = await createClient();

  const [
    { data: memorizations },
    { data: surahs },
    { data: students },
    { data: classes },
  ] = await Promise.all([
    supabase
      .from("quran_memorization")
      .select(
        "id, student_id, surah_number, from_ayah, to_ayah, status, score, tajweed_score, assessed_at, students:student_id(name_ar), quran_surahs:surah_number(name_ar)"
      )
      .order("surah_number")
      .limit(2000),
    supabase.from("quran_surahs").select("number, name_ar").order("number"),
    supabase
      .from("students")
      .select("id, name_ar, current_class_id")
      .eq("status", "enrolled")
      .order("name_ar")
      .limit(2000),
    supabase
      .from("classes")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  // Map memorizations to typed rows
  const rows: MemorizationRow[] = (memorizations ?? []).map((m: any) => ({
    id: m.id,
    student_id: m.student_id,
    student_name_ar: m.students?.name_ar ?? "—",
    surah_number: m.surah_number,
    surah_name_ar: m.quran_surahs?.name_ar ?? `سورة ${m.surah_number}`,
    from_ayah: m.from_ayah,
    to_ayah: m.to_ayah,
    status: m.status as "not_started" | "in_progress" | "memorized",
    score: m.score,
    tajweed_score: m.tajweed_score,
    assessed_at: m.assessed_at,
  }));

  const surahOptions = (surahs ?? []).map((s: any) => ({
    number: s.number,
    name_ar: s.name_ar,
  }));

  const studentOptions: StudentOption[] = (students ?? []).map((s: any) => ({
    id: s.id,
    name_ar: s.name_ar,
  }));

  // Build classes with their enrolled students for the class filter
  const classesWithStudents = (classes ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    students: (students ?? [])
      .filter((s: any) => s.current_class_id === c.id)
      .map((s: any) => ({ id: s.id, name_ar: s.name_ar })),
  }));

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle="تتبع حفظ القرآن الكريم ودرجات التجويد"
      />

      <MemorizationTable
        rows={rows}
        surahs={surahOptions}
        students={studentOptions}
        classes={classesWithStudents}
        canWrite={hasPermission(profile.role, "islamic:write")}
      />
    </div>
  );
}
