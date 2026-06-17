"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { BookOpen, BookPlus, ChevronDown, ChevronLeft } from "lucide-react";
import { upsertCoverage } from "./actions";
import { CreatePlanDialog } from "./create-plan-dialog";
import type { CoverageStatus } from "./schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Data types coming from server ──────────────────────────────────────────
export type CoverageRow = {
  lesson_id: string;
  class_id: string;
  status: CoverageStatus;
  covered_on: string | null;
};

export type LessonRow = {
  id: string;
  title: string;
  outcomes: string | null;
  planned_date: string | null;
  sort_order: number;
  unit_id: string;
};

export type UnitRow = {
  id: string;
  plan_id: string;
  title: string;
  sort_order: number;
};

export type PlanRow = {
  id: string;
  title: string;
  subject_name: string;
  grade_name: string | null;
  year_name: string | null;
};

export type ClassOption = { id: string; name: string };
export type SubjectOption = { id: string; name_ar: string };
export type GradeOption = { id: string; name_ar: string };
export type YearOption = { id: string; name: string };

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<CoverageStatus, string> = {
  not_started: "لم يبدأ",
  in_progress: "جارٍ",
  completed: "مكتمل",
};

const STATUS_BADGE: Record<CoverageStatus, "secondary" | "warning" | "success"> = {
  not_started: "secondary",
  in_progress: "warning",
  completed: "success",
};

// ─── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-blue-400";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute inset-y-0 start-0 rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="w-10 text-end text-xs text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function CurriculumTracker({
  plans,
  units,
  lessons,
  coverageRows,
  classes,
  subjects,
  gradeLevels,
  academicYears,
  canWrite,
}: {
  plans: PlanRow[];
  units: UnitRow[];
  lessons: LessonRow[];
  coverageRows: CoverageRow[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  gradeLevels: GradeOption[];
  academicYears: YearOption[];
  canWrite: boolean;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id ?? "");
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? "");
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Build a fast lookup: `${lessonId}__${classId}` → status
  const coverageMap = useMemo(() => {
    const map = new Map<string, CoverageStatus>();
    for (const row of coverageRows) {
      map.set(`${row.lesson_id}__${row.class_id}`, row.status);
    }
    return map;
  }, [coverageRows]);

  const planUnits = useMemo(
    () => units.filter((u) => u.plan_id === selectedPlanId).sort((a, b) => a.sort_order - b.sort_order),
    [units, selectedPlanId]
  );

  const planLessons = useMemo(() => {
    const unitIds = new Set(planUnits.map((u) => u.id));
    return lessons.filter((l) => unitIds.has(l.unit_id));
  }, [lessons, planUnits]);

  // Completion % for selected plan + class
  const completionPct = useMemo(() => {
    if (!planLessons.length || !selectedClassId) return 0;
    const completed = planLessons.filter(
      (l) => coverageMap.get(`${l.id}__${selectedClassId}`) === "completed"
    ).length;
    return (completed / planLessons.length) * 100;
  }, [planLessons, coverageMap, selectedClassId]);

  function toggleUnit(id: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changeStatus(lesson_id: string, status: CoverageStatus) {
    if (!selectedClassId) return;
    startTransition(async () => {
      const res = await upsertCoverage({
        lesson_id,
        class_id: selectedClassId,
        status,
        covered_on: status === "completed" ? new Date().toISOString().slice(0, 10) : null,
      });
      if (res.ok) toast.success("تم حفظ التغطية");
      else toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    });
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
        <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-1 text-lg font-semibold">لا توجد خطط منهجية</p>
        <p className="mb-6 text-sm text-muted-foreground">
          ابدأ بإنشاء خطة منهجية لتتبع تغطية المواد الدراسية.
        </p>
        {canWrite && (
          <CreatePlanDialog
            subjects={subjects}
            gradeLevels={gradeLevels}
            academicYears={academicYears}
            trigger={
              <Button>
                <BookPlus /> إنشاء خطة منهج
              </Button>
            }
          />
        )}
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="space-y-5">
      {/* ── Controls row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {/* Plan selector */}
          <div className="w-full sm:w-64">
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر خطة المنهج" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Class selector */}
          <div className="w-full sm:w-44">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفصل" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canWrite && (
          <CreatePlanDialog
            subjects={subjects}
            gradeLevels={gradeLevels}
            academicYears={academicYears}
            trigger={
              <Button variant="outline">
                <BookPlus /> خطة جديدة
              </Button>
            }
          />
        )}
      </div>

      {/* ── Plan summary card ── */}
      {selectedPlan && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{selectedPlan.title}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedPlan.subject_name}
                  {selectedPlan.grade_name ? ` · ${selectedPlan.grade_name}` : ""}
                  {selectedPlan.year_name ? ` · ${selectedPlan.year_name}` : ""}
                </p>
              </div>
              <div className="text-end text-sm text-muted-foreground">
                {planLessons.length} درس في {planUnits.length} وحدة
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">نسبة الإنجاز</span>
                <span className="font-semibold">{Math.round(completionPct)}%</span>
              </div>
              <ProgressBar pct={completionPct} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Units + Lessons ── */}
      {planUnits.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          لا توجد وحدات أو دروس في هذه الخطة بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {planUnits.map((unit) => {
            const unitLessons = lessons
              .filter((l) => l.unit_id === unit.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            const unitCompleted = unitLessons.filter(
              (l) => coverageMap.get(`${l.id}__${selectedClassId}`) === "completed"
            ).length;
            const unitPct = unitLessons.length
              ? (unitCompleted / unitLessons.length) * 100
              : 0;
            const isExpanded = expandedUnits.has(unit.id);

            return (
              <div key={unit.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Unit header */}
                <button
                  type="button"
                  onClick={() => toggleUnit(unit.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-start hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{unit.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {unitCompleted}/{unitLessons.length}
                    </Badge>
                  </div>
                  <div className="w-28 md:w-36">
                    <ProgressBar pct={unitPct} />
                  </div>
                </button>

                {/* Lessons list */}
                {isExpanded && (
                  <div className="divide-y">
                    {unitLessons.map((lesson) => {
                      const key = `${lesson.id}__${selectedClassId}`;
                      const status: CoverageStatus =
                        coverageMap.get(key) ?? "not_started";
                      return (
                        <div
                          key={lesson.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{lesson.title}</p>
                            {lesson.outcomes && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {lesson.outcomes}
                              </p>
                            )}
                            {lesson.planned_date && (
                              <p className="text-xs text-muted-foreground">
                                مخطط: {lesson.planned_date}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_BADGE[status]}>
                              {STATUS_LABELS[status]}
                            </Badge>
                            {canWrite && selectedClassId && (
                              <Select
                                value={status}
                                onValueChange={(v) =>
                                  changeStatus(lesson.id, v as CoverageStatus)
                                }
                                disabled={pending}
                              >
                                <SelectTrigger className="h-7 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">لم يبدأ</SelectItem>
                                  <SelectItem value="in_progress">جارٍ</SelectItem>
                                  <SelectItem value="completed">مكتمل</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
