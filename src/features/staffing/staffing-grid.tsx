"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { saveAllocation, updateStaffPlan } from "./actions";
import { ROLE_TAGS } from "./schema";

const KNOWN_TAGS: ReadonlySet<string> = new Set(ROLE_TAGS);

export type GradeCol = { id: string; name: string; classes: { id: string; name: string }[] };
export type TeacherRow = {
  id: string;
  name: string;
  nisab: number;
  exempt: number;
  roleTags: string[];
};
export type Alloc = { staff_id: string; class_id: string; periods: number };

type CellMap = Record<string, Record<string, number>>; // staffId -> classId -> periods

export function StaffingGrid({
  departmentId,
  academicYearId,
  periodsPerClass,
  grades,
  teachers,
  allocations,
  canWrite,
}: {
  departmentId: string;
  academicYearId: string;
  periodsPerClass: number;
  grades: GradeCol[];
  teachers: TeacherRow[];
  allocations: Alloc[];
  canWrite: boolean;
}) {
  const t = useTranslations("staffing");
  const [, startTransition] = useTransition();

  const flatClasses = useMemo(() => grades.flatMap((g) => g.classes), [grades]);

  // Local editable state seeded from the server allocations.
  const [cells, setCells] = useState<CellMap>(() => {
    const m: CellMap = {};
    for (const t of teachers) m[t.id] = {};
    for (const a of allocations) {
      (m[a.staff_id] ??= {})[a.class_id] = a.periods;
    }
    return m;
  });
  const [exempt, setExempt] = useState<Record<string, number>>(() =>
    Object.fromEntries(teachers.map((t) => [t.id, t.exempt]))
  );

  function teachingTotal(staffId: string): number {
    return Object.values(cells[staffId] ?? {}).reduce((s, n) => s + (n || 0), 0);
  }
  function classTotal(classId: string): number {
    return teachers.reduce((s, t) => s + (cells[t.id]?.[classId] || 0), 0);
  }

  function commitCell(staffId: string, classId: string, raw: string) {
    const periods = Math.max(0, Math.min(40, Math.round(Number(raw) || 0)));
    const prev = cells[staffId]?.[classId] ?? 0;
    if (periods === prev) return;
    setCells((c) => ({ ...c, [staffId]: { ...(c[staffId] ?? {}), [classId]: periods } }));
    startTransition(async () => {
      const res = await saveAllocation({
        staff_id: staffId,
        class_id: classId,
        department_id: departmentId,
        academic_year_id: academicYearId,
        periods,
      });
      if (!res.ok) {
        toast.error(res.error === "forbidden" ? t("forbidden") : t("saveError"));
        setCells((c) => ({ ...c, [staffId]: { ...(c[staffId] ?? {}), [classId]: prev } })); // rollback
      }
    });
  }

  function commitExempt(staffId: string, raw: string, nisab: number) {
    const val = Math.max(0, Math.min(40, Math.round(Number(raw) || 0)));
    const prev = exempt[staffId] ?? 0;
    if (val === prev) return;
    setExempt((e) => ({ ...e, [staffId]: val }));
    startTransition(async () => {
      const res = await updateStaffPlan(staffId, { nisab, exempt_periods: val });
      if (!res.ok) {
        toast.error(res.error === "forbidden" ? t("forbidden") : t("saveError"));
        setExempt((e) => ({ ...e, [staffId]: prev }));
      }
    });
  }

  const stickyName =
    "sticky start-0 z-10 bg-card border-e";

  return (
    <div className="space-y-3">
      {/* Header summary band */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("teacherCount")} value={teachers.length} />
        <Stat label={t("nisab")} value={teachers[0]?.nisab ?? 18} />
        <Stat
          label={t("periodCount")}
          value={teachers.reduce((s, t) => s + teachingTotal(t.id), 0)}
        />
        <Stat label={t("classCount")} value={flatClasses.length} />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            {/* Grade groups */}
            <tr className="border-b bg-muted/40">
              <th className={cn(stickyName, "px-2 py-2 text-center font-semibold")} rowSpan={2}>
                #
              </th>
              <th className={cn(stickyName, "start-8 px-3 py-2 text-start font-semibold min-w-[9rem]")} rowSpan={2}>
                {t("teacher")}
              </th>
              {grades.map((g) => (
                <th
                  key={g.id}
                  colSpan={g.classes.length}
                  className="border-s px-2 py-1.5 text-center font-semibold text-muted-foreground"
                >
                  {g.name}
                </th>
              ))}
              <th className="border-s px-2 py-2 text-center font-semibold" rowSpan={2}>
                {t("total")}
              </th>
              <th className="px-2 py-2 text-center font-semibold" rowSpan={2}>
                {t("exempt")}
              </th>
              <th className="px-2 py-2 text-center font-semibold" rowSpan={2}>
                {t("load")}
              </th>
              <th className="px-3 py-2 text-start font-semibold min-w-[10rem]" rowSpan={2}>
                {t("notes")}
              </th>
            </tr>
            {/* Class numbers */}
            <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
              {grades.map((g) =>
                g.classes.map((c, i) => (
                  <th
                    key={c.id}
                    className={cn("px-1.5 py-1 text-center font-medium", i === 0 && "border-s")}
                    title={c.name}
                  >
                    {c.name.split("/").pop() ?? i + 1}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher, idx) => {
              const teaching = teachingTotal(teacher.id);
              const load = teaching + (exempt[teacher.id] ?? 0);
              const loadDelta = load - teacher.nisab;
              return (
                <tr key={teacher.id} className={idx % 2 ? "bg-muted/10" : ""}>
                  <td className={cn(stickyName, idx % 2 ? "!bg-muted/10" : "", "px-2 py-1.5 text-center text-muted-foreground")}>
                    {idx + 1}
                  </td>
                  <td className={cn(stickyName, "start-8", idx % 2 ? "!bg-muted/10" : "", "px-3 py-1.5 font-medium")}>
                    {teacher.name}
                  </td>
                  {grades.map((g) =>
                    g.classes.map((c, i) => {
                      const val = cells[teacher.id]?.[c.id] ?? 0;
                      return (
                        <td key={c.id} className={cn("px-0.5 py-0.5 text-center", i === 0 && "border-s")}>
                          {canWrite ? (
                            <input
                              type="number"
                              min={0}
                              max={40}
                              defaultValue={val || ""}
                              onBlur={(e) => commitCell(teacher.id, c.id, e.target.value)}
                              className="h-8 w-9 rounded-md border bg-background text-center text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          ) : (
                            <span className={val ? "" : "text-muted-foreground/30"}>{val || "—"}</span>
                          )}
                        </td>
                      );
                    })
                  )}
                  <td className="border-s px-2 py-1.5 text-center font-semibold tabular-nums">
                    {teaching}
                  </td>
                  <td className="px-1 py-1 text-center">
                    {canWrite ? (
                      <input
                        type="number"
                        min={0}
                        max={40}
                        defaultValue={exempt[teacher.id] || ""}
                        onBlur={(e) => commitExempt(teacher.id, e.target.value, teacher.nisab)}
                        className="h-8 w-10 rounded-md border bg-background text-center text-sm outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : (
                      <span className="tabular-nums">{exempt[teacher.id] || 0}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <LoadBadge load={load} delta={loadDelta} t={t} />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {teacher.roleTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {KNOWN_TAGS.has(tag) ? t(`roles.${tag}`) : tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/30 font-medium">
              <td className={cn(stickyName, "!bg-muted/30 px-2 py-2 text-center")} colSpan={2}>
                {t("perClass")} ({periodsPerClass})
              </td>
              {grades.map((g) =>
                g.classes.map((c, i) => {
                  const tot = classTotal(c.id);
                  const ok = tot === periodsPerClass;
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        "px-1 py-1.5 text-center text-xs tabular-nums",
                        i === 0 && "border-s",
                        ok ? "text-foreground" : tot > periodsPerClass ? "text-destructive" : "text-amber-600"
                      )}
                      title={ok ? t("coverageOk") : tot > periodsPerClass ? t("coverageOver") : t("coverageUnder")}
                    >
                      {tot}
                    </td>
                  );
                })
              )}
              <td className="border-s px-2 py-2 text-center tabular-nums" colSpan={4}>
                {teachers.reduce((s, t) => s + teachingTotal(t.id), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{t("legend")}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function LoadBadge({
  load,
  delta,
  t,
}: {
  load: number;
  delta: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const tone =
    delta === 0
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : delta > 0
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  const title = delta === 0 ? t("loadOk") : delta > 0 ? t("loadOver") : t("loadUnder");
  return (
    <span
      title={title}
      className={cn("inline-block min-w-7 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums", tone)}
    >
      {load}
    </span>
  );
}
