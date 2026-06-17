import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { TimetableGrid, type SlotRow, type PeriodOption } from "@/features/timetable/timetable-grid";
import { ClassSwitcher } from "@/features/timetable/class-switcher";

export const dynamic = "force-dynamic";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "timetable:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  // Resolve selected class from search param
  const { class: classParam } = await searchParams;

  // Fetch all active classes for the class switcher
  const { data: classesRaw } = await supabase
    .from("classes")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const classes: { id: string; name: string }[] = classesRaw ?? [];

  // Active class: either from URL param or first class
  const selectedClassId = classParam && classes.some((c) => c.id === classParam)
    ? classParam
    : (classes[0]?.id ?? null);

  // Fetch reference data in parallel
  const [
    { data: periodsRaw },
    { data: subjectsRaw },
    { data: staffRaw },
    { data: roomsRaw },
    { data: slotsRaw },
  ] = await Promise.all([
    supabase
      .from("periods" as any)
      .select("id, label, start_time, end_time, sort_order")
      .order("sort_order"),
    supabase.from("subjects").select("id, name_ar").order("name_ar"),
    supabase.from("staff").select("id, name_ar").eq("status", "active").order("name_ar"),
    supabase.from("rooms" as any).select("id, name").order("name"),
    selectedClassId
      ? supabase
          .from("timetable_slots" as any)
          .select(
            "id, day_of_week, period_id, subjects:subject_id(name_ar), staff:staff_id(name_ar), rooms:room_id(name)"
          )
          .eq("class_id", selectedClassId)
      : Promise.resolve({ data: [] }),
  ]);

  const periods: PeriodOption[] = ((periodsRaw as any[]) ?? []).map((p: any) => ({
    id: p.id,
    label: p.label,
    start_time: p.start_time,
    end_time: p.end_time,
  }));

  const subjects = ((subjectsRaw ?? []) as any[]).map((s: any) => ({
    id: s.id,
    label: s.name_ar,
  }));

  const staff = ((staffRaw ?? []) as any[]).map((s: any) => ({
    id: s.id,
    label: s.name_ar,
  }));

  const rooms = ((roomsRaw as any[]) ?? []).map((r: any) => ({
    id: r.id,
    label: r.name,
  }));

  const slots: SlotRow[] = ((slotsRaw as any[]) ?? []).map((s: any) => ({
    id: s.id,
    day_of_week: s.day_of_week,
    period_id: s.period_id,
    subject_name: s.subjects?.name_ar ?? null,
    staff_name: s.staff?.name_ar ?? null,
    room_name: s.rooms?.name ?? null,
  }));

  const canWrite = hasPermission(profile.role, "timetable:write");

  return (
    <div>
      <PageHeader title="الجدول الدراسي" subtitle={t("timetable")}>
        <Suspense fallback={null}>
          <ClassSwitcher classes={classes} selectedClassId={selectedClassId} />
        </Suspense>
      </PageHeader>

      {classes.length === 0 ? (
        <div className="rounded-xl border bg-card py-20 text-center text-muted-foreground">
          لا توجد فصول دراسية نشطة. يُرجى إضافة الفصول أولاً.
        </div>
      ) : selectedClassId ? (
        <TimetableGrid
          classId={selectedClassId}
          slots={slots}
          periods={periods}
          subjects={subjects}
          staff={staff}
          rooms={rooms}
          canWrite={canWrite}
        />
      ) : null}
    </div>
  );
}
