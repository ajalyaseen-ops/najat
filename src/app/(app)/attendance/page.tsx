import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/shell/page-header";
import { AttendanceGrid, type StudentRosterRow } from "@/features/attendance/attendance-grid";
import { ClassDatePicker } from "@/features/attendance/class-date-picker";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>;
}) {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "attendance:read")) redirect("/dashboard");

  const t = await getTranslations("attendance");
  const supabase = await createClient();

  const sp = await searchParams;

  // Load active classes for the picker
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const activeClasses = classes ?? [];

  // Resolve the selected class (default = first class)
  const selectedClassId = sp.class ?? activeClasses[0]?.id ?? "";
  const selectedDate = sp.date ?? todayISO();

  // If no class exists yet, render an empty state
  if (!selectedClassId) {
    return (
      <div>
        <PageHeader title={t("title")} subtitle="رصد الحضور اليومي" />
        <p className="text-muted-foreground text-sm">لا توجد فصول نشطة. أضف فصلاً أولاً.</p>
      </div>
    );
  }

  // Load students enrolled in the chosen class
  const { data: students } = await supabase
    .from("students")
    .select("id, name_ar, name_en")
    .eq("current_class_id", selectedClassId)
    .eq("status", "enrolled")
    .order("name_ar");

  const studentList = students ?? [];
  const studentIds = studentList.map((s: any) => s.id);

  // Load existing attendance records for this class+date
  const { data: existingRecords } = studentIds.length
    ? await supabase
        .from("attendance_records")
        .select("id, student_id, status")
        .eq("class_id", selectedClassId)
        .eq("date", selectedDate)
        .in("student_id", studentIds)
    : { data: [] };

  const recordMap = new Map<string, { id: string; status: string }>();
  for (const r of existingRecords ?? []) {
    recordMap.set((r as any).student_id, { id: (r as any).id, status: (r as any).status });
  }

  const roster: StudentRosterRow[] = studentList.map((s: any) => {
    const rec = recordMap.get(s.id);
    return {
      id: s.id,
      name_ar: s.name_ar,
      name_en: s.name_en ?? null,
      currentStatus: (rec?.status as StudentRosterRow["currentStatus"]) ?? null,
      attendanceId: rec?.id ?? null,
    };
  });

  const canWrite = hasPermission(profile.role, "attendance:write");

  // Format selected date for display
  const displayDate = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(selectedDate + "T00:00:00"));

  const selectedClassName = activeClasses.find((c) => c.id === selectedClassId)?.name ?? "";

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={`${selectedClassName} — ${displayDate}`}
      />

      {/* Class & date selectors */}
      <div className="mb-6">
        <ClassDatePicker
          classes={activeClasses}
          selectedClassId={selectedClassId}
          selectedDate={selectedDate}
        />
      </div>

      {/* The main attendance grid */}
      <AttendanceGrid
        students={roster}
        classId={selectedClassId}
        date={selectedDate}
        canWrite={canWrite}
      />
    </div>
  );
}
