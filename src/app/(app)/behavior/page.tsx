import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { BehaviorTable, type BehaviorRow } from "@/features/behavior/behavior-table";

export const dynamic = "force-dynamic";

export default async function BehaviorPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "behavior:read")) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: records }, { data: students }] = await Promise.all([
    supabase
      .from("behavior_records")
      .select(
        "id, student_id, kind, category, description, action_taken, points, date, students:student_id(name_ar)"
      )
      .order("date", { ascending: false })
      .limit(500),
    supabase
      .from("students")
      .select("id, name_ar")
      .eq("status", "enrolled")
      .order("name_ar"),
  ]);

  const rows: BehaviorRow[] = (records ?? []).map((r: any) => ({
    id: r.id,
    student_id: r.student_id,
    studentName: (r.students as any)?.name_ar ?? null,
    kind: r.kind as "positive" | "negative",
    category: r.category,
    description: r.description ?? null,
    action_taken: r.action_taken ?? null,
    date: r.date,
    points: r.points ?? 0,
  }));

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name_ar: s.name_ar,
  }));

  return (
    <div>
      <PageHeader title="السلوك والانضباط" subtitle="سجلات السلوك والإجراءات التأديبية للطلاب" />
      <BehaviorTable
        rows={rows}
        students={studentOptions}
        canWrite={hasPermission(profile.role, "behavior:write")}
      />
    </div>
  );
}
