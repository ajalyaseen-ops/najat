"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Save,
  BookOpen,
  PlusCircle,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveGrades, archiveAssessment, createAssessment } from "./actions";
import { assessmentCreateSchema, type AssessmentCreateInput } from "./schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── Domain types ─────────────────────────────────────────────────────────────

export type ClassOption = { id: string; name: string };
export type SubjectOption = { id: string; name_ar: string; code: string };
export type AssessmentTypeOption = {
  id: string;
  name_ar: string;
  weight: number;
  max_score: number;
};

export type AssessmentRow = {
  id: string;
  title: string;
  max_score: number;
  date: string | null;
  term: number;
  assessment_type_id: string | null;
  assessment_types: { name_ar: string; weight: number } | null;
};

export type StudentGradeRow = {
  student_id: string;
  student_name: string;
  scores: Record<string, number | null>;
};

// ── Score input ───────────────────────────────────────────────────────────────

function ScoreInput({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number | null;
  max: number;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      step={0.5}
      disabled={disabled}
      value={value === null ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : Math.min(Number(raw), max));
      }}
      className="w-16 rounded border border-input bg-background px-1.5 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
    />
  );
}

// ── Percentage badge ──────────────────────────────────────────────────────────

function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
  const variant =
    pct >= 85
      ? "success"
      : pct >= 70
      ? "secondary"
      : pct >= 50
      ? "warning"
      : "destructive";
  return (
    <Badge variant={variant as "success" | "secondary" | "warning" | "destructive"}>
      {pct.toFixed(1)}%
    </Badge>
  );
}

// ── Assessment create dialog ──────────────────────────────────────────────────

function AssessmentDialog({
  classId,
  subjectId,
  term,
  assessmentTypes,
  onCreated,
}: {
  classId: string;
  subjectId: string;
  term: number;
  assessmentTypes: AssessmentTypeOption[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const f = "space-y-1.5";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssessmentCreateInput>({
    resolver: zodResolver(assessmentCreateSchema),
    defaultValues: {
      class_id: classId,
      subject_id: subjectId,
      term,
      max_score: 100,
      title: "",
      assessment_type_id: null,
      date: null,
    },
  });

  // Keep hidden fields in sync when parent selection changes
  useEffect(() => {
    setValue("class_id", classId);
    setValue("subject_id", subjectId);
    setValue("term", term);
  }, [classId, subjectId, term, setValue]);

  function onTypeChange(typeId: string) {
    setValue("assessment_type_id", typeId);
    const t = assessmentTypes.find((a) => a.id === typeId);
    if (t) setValue("max_score", t.max_score);
  }

  async function onSubmit(values: AssessmentCreateInput) {
    const res = await createAssessment({
      ...values,
      class_id: classId,
      subject_id: subjectId,
      term,
    });
    if (res.ok) {
      toast.success("تم إنشاء التقييم");
      setOpen(false);
      reset();
      onCreated();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="h-4 w-4" />
          إضافة تقييم
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة تقييم جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className={f}>
            <Label>عنوان التقييم *</Label>
            <Input {...register("title")} placeholder="مثال: اختبار الوحدة الأولى" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className={f}>
            <Label>نوع التقييم</Label>
            <Select
              value={watch("assessment_type_id") ?? undefined}
              onValueChange={onTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر النوع (اختياري)" />
              </SelectTrigger>
              <SelectContent>
                {assessmentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name_ar} ({t.weight}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={f}>
              <Label>الدرجة القصوى *</Label>
              <Input
                type="number"
                min={1}
                step={0.5}
                {...register("max_score")}
              />
              {errors.max_score && (
                <p className="text-xs text-destructive">{errors.max_score.message}</p>
              )}
            </div>
            <div className={f}>
              <Label>تاريخ التقييم</Label>
              <Input type="date" {...register("date")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin h-4 w-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main gradebook client ─────────────────────────────────────────────────────

export function GradesClient({
  classes,
  subjects,
  assessmentTypes,
  allAssessments,
  allStudentGrades,
  canWrite,
}: {
  classes: ClassOption[];
  subjects: SubjectOption[];
  assessmentTypes: AssessmentTypeOption[];
  allAssessments: AssessmentRow[];
  allStudentGrades: StudentGradeRow[];
  canWrite: boolean;
}) {
  const [classId, setClassId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [term, setTerm] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // ── Derived filter ──────────────────────────────────────────────────────────
  const filtersSet = !!classId && !!subjectId;

  const filteredAssessments = allAssessments.filter(
    (a) =>
      (!classId || (a as any).class_id === classId) &&
      (!subjectId || (a as any).subject_id === subjectId) &&
      (a as any).term === term
  );

  const filteredStudents = allStudentGrades.filter(
    (s) => !classId || (s as any).class_id === classId
  );

  // ── Local editable scores ───────────────────────────────────────────────────
  const [localScores, setLocalScores] = useState<
    Record<string, Record<string, number | null>>
  >(() => buildScores(allStudentGrades));

  function buildScores(rows: StudentGradeRow[]) {
    return Object.fromEntries(rows.map((r) => [r.student_id, { ...r.scores }]));
  }

  // Reset scores when server data updates (from revalidatePath)
  useEffect(() => {
    setLocalScores(buildScores(allStudentGrades));
  }, [allStudentGrades]);

  function setScore(studentId: string, assessmentId: string, val: number | null) {
    setLocalScores((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [assessmentId]: val },
    }));
  }

  // ── Weighted percentage ────────────────────────────────────────────────────
  const hasWeights = assessmentTypes.some((t) => t.weight > 0);

  function computePercent(studentId: string): number | null {
    const scores = localScores[studentId];
    if (!scores) return null;

    const relevantAssessments = filteredAssessments;
    if (relevantAssessments.length === 0) return null;

    if (hasWeights) {
      const typeMap: Record<
        string,
        { totalPct: number; count: number; weight: number }
      > = {};
      for (const a of relevantAssessments) {
        const typeId = a.assessment_type_id ?? "__none__";
        const weight = a.assessment_types?.weight ?? 0;
        const score = scores[a.id];
        if (score === null || score === undefined) continue;
        const pct = (score / a.max_score) * 100;
        if (!typeMap[typeId]) typeMap[typeId] = { totalPct: 0, count: 0, weight };
        typeMap[typeId].totalPct += pct;
        typeMap[typeId].count += 1;
      }
      let totalWeight = 0;
      let weightedSum = 0;
      for (const e of Object.values(typeMap)) {
        if (e.count === 0 || e.weight === 0) continue;
        weightedSum += (e.totalPct / e.count) * e.weight;
        totalWeight += e.weight;
      }
      return totalWeight > 0 ? weightedSum / totalWeight : null;
    } else {
      let sumScore = 0;
      let sumMax = 0;
      for (const a of relevantAssessments) {
        const s = scores[a.id];
        if (s === null || s === undefined) continue;
        sumScore += s;
        sumMax += a.max_score;
      }
      return sumMax > 0 ? (sumScore / sumMax) * 100 : null;
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function onSave() {
    if (!filtersSet) {
      toast.error("اختر الفصل والمادة أولاً");
      return;
    }
    const gradesPayload = filteredStudents.flatMap((row) =>
      filteredAssessments.map((a) => ({
        assessment_id: a.id,
        student_id: row.student_id,
        score: localScores[row.student_id]?.[a.id] ?? null,
        note: null,
      }))
    );

    setIsSaving(true);
    try {
      const res = await saveGrades({
        class_id: classId,
        subject_id: subjectId,
        term,
        grades: gradesPayload,
      });
      if (res.ok) toast.success("تم حفظ الدرجات بنجاح");
      else toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Archive assessment ─────────────────────────────────────────────────────
  async function onArchiveAssessment(id: string) {
    const res = await archiveAssessment(id);
    if (res.ok) toast.success("تم حذف التقييم");
    else toast.error(res.error);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-44">
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

        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="اختر المادة" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(term)} onValueChange={(v) => setTerm(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">الفصل الأول</SelectItem>
            <SelectItem value="2">الفصل الثاني</SelectItem>
            <SelectItem value="3">الفصل الثالث</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-2">
          {canWrite && filtersSet && (
            <>
              <AssessmentDialog
                classId={classId}
                subjectId={subjectId}
                term={term}
                assessmentTypes={assessmentTypes}
                onCreated={() => {}} // revalidatePath handles refresh
              />
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "جارٍ الحفظ…" : "حفظ الدرجات"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grade grid */}
      {!filtersSet ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 opacity-20" />
          <p className="text-sm">اختر الفصل والمادة والفصل الدراسي لعرض دفتر الدرجات</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky start-0 z-10 min-w-[180px] bg-card border-e">
                  الطالب
                </TableHead>
                {filteredAssessments.map((a) => (
                  <TableHead key={a.id} className="min-w-[120px] text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-medium text-sm">{a.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.assessment_types?.name_ar
                          ? `${a.assessment_types.name_ar} — `
                          : ""}
                        من {a.max_score}
                      </span>
                      {a.date && (
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {a.date}
                        </span>
                      )}
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="mt-0.5 rounded p-0.5 hover:bg-muted">
                              <MoreHorizontal className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onArchiveAssessment(a.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف التقييم
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="sticky end-0 z-10 min-w-[90px] bg-card border-s text-center">
                  النسبة
                  {hasWeights && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      (موزونة)
                    </span>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={filteredAssessments.length + 2}
                    className="py-10 text-center text-muted-foreground"
                  >
                    لا يوجد طلاب في هذا الفصل
                  </TableCell>
                </TableRow>
              ) : filteredAssessments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-10 text-center text-muted-foreground"
                  >
                    لا توجد تقييمات لهذا الاختيار — أضف تقييماً أولاً
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((row) => {
                  const pct = computePercent(row.student_id);
                  return (
                    <TableRow key={row.student_id}>
                      <TableCell className="sticky start-0 z-10 bg-card border-e font-medium">
                        {row.student_name}
                      </TableCell>
                      {filteredAssessments.map((a) => (
                        <TableCell key={a.id} className="text-center">
                          <ScoreInput
                            value={localScores[row.student_id]?.[a.id] ?? null}
                            max={a.max_score}
                            onChange={(v) => setScore(row.student_id, a.id, v)}
                            disabled={!canWrite}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="sticky end-0 z-10 bg-card border-s text-center">
                        <PctBadge pct={pct} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {hasWeights && filteredAssessments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          * النسبة محسوبة وفق أوزان أنواع التقييم المعتمدة لدى المدرسة.
        </p>
      )}
    </div>
  );
}
