"use client";

import { useMemo, useState } from "react";
import { BookOpen, Pencil, Search, Plus } from "lucide-react";
import { MemorizationFormDialog, type SurahOption, type StudentOption } from "./memorization-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export type MemorizationRow = {
  id: string;
  student_id: string;
  student_name_ar: string;
  surah_number: number;
  surah_name_ar: string;
  from_ayah: number | null;
  to_ayah: number | null;
  status: "not_started" | "in_progress" | "memorized";
  score: number | null;
  tajweed_score: number | null;
  assessed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "لم يبدأ",
  in_progress: "جارٍ الحفظ",
  memorized: "محفوظ",
};

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success"> = {
  not_started: "secondary",
  in_progress: "warning",
  memorized: "success",
};

function ProgressSummary({
  rows,
  students,
  selectedStudentId,
}: {
  rows: MemorizationRow[];
  students: StudentOption[];
  selectedStudentId: string;
}) {
  const studentRows = selectedStudentId
    ? rows.filter((r) => r.student_id === selectedStudentId)
    : rows;

  const memorized = studentRows.filter((r) => r.status === "memorized").length;
  const inProgress = studentRows.filter((r) => r.status === "in_progress").length;
  const total = studentRows.length;

  const avgScore =
    studentRows.filter((r) => r.score !== null).length > 0
      ? (
          studentRows.reduce((s, r) => s + (r.score ?? 0), 0) /
          studentRows.filter((r) => r.score !== null).length
        ).toFixed(1)
      : "—";

  const avgTajweed =
    studentRows.filter((r) => r.tajweed_score !== null).length > 0
      ? (
          studentRows.reduce((s, r) => s + (r.tajweed_score ?? 0), 0) /
          studentRows.filter((r) => r.tajweed_score !== null).length
        ).toFixed(1)
      : "—";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">السور المحفوظة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-success">{memorized}</p>
          <p className="mt-1 text-xs text-muted-foreground">من {total} سجل</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">جارٍ الحفظ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-warning-foreground">{inProgress}</p>
          <p className="mt-1 text-xs text-muted-foreground">سورة</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">متوسط الدرجة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{avgScore}</p>
          <p className="mt-1 text-xs text-muted-foreground">من 100</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">متوسط التجويد</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{avgTajweed}</p>
          <p className="mt-1 text-xs text-muted-foreground">من 100</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function MemorizationTable({
  rows,
  surahs,
  students,
  classes,
  canWrite,
}: {
  rows: MemorizationRow[];
  surahs: SurahOption[];
  students: StudentOption[];
  classes: { id: string; name: string; students: StudentOption[] }[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter students by class selection
  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    const cls = classes.find((c) => c.id === selectedClassId);
    return cls ? cls.students : students;
  }, [selectedClassId, classes, students]);

  const filtered = useMemo(() => {
    let result = rows;

    if (selectedStudentId) {
      result = result.filter((r) => r.student_id === selectedStudentId);
    } else if (selectedClassId) {
      const classStudentIds = new Set(filteredStudents.map((s) => s.id));
      result = result.filter((r) => classStudentIds.has(r.student_id));
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.student_name_ar.toLowerCase().includes(q) ||
          r.surah_name_ar.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, selectedStudentId, selectedClassId, filteredStudents, statusFilter, query]);

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <ProgressSummary
        rows={rows}
        students={students}
        selectedStudentId={selectedStudentId}
      />

      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث..."
            className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Select
          value={selectedClassId || "all"}
          onValueChange={(v) => {
            setSelectedClassId(v === "all" ? "" : v);
            setSelectedStudentId("");
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="كل الفصول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفصول</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedStudentId || "all"}
          onValueChange={(v) => setSelectedStudentId(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="كل الطلاب" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">كل الطلاب</SelectItem>
            {filteredStudents.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="not_started">لم يبدأ</SelectItem>
            <SelectItem value="in_progress">جارٍ الحفظ</SelectItem>
            <SelectItem value="memorized">محفوظ</SelectItem>
          </SelectContent>
        </Select>

        {canWrite && (
          <div className="ms-auto">
            <MemorizationFormDialog
              surahs={surahs}
              students={students}
              defaultStudentId={selectedStudentId}
              trigger={
                <Button>
                  <Plus /> إضافة سجل حفظ
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الطالب</TableHead>
              <TableHead>السورة</TableHead>
              <TableHead>الآيات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الدرجة</TableHead>
              <TableHead>التجويد</TableHead>
              <TableHead>تاريخ التقييم</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.student_name_ar}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    {r.surah_number}. {r.surah_name_ar}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.from_ayah && r.to_ayah
                    ? `${r.from_ayah} – ${r.to_ayah}`
                    : r.from_ayah
                    ? `من ${r.from_ayah}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.score !== null ? (
                    <span className={r.score >= 90 ? "text-success font-semibold" : ""}>
                      {r.score}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {r.tajweed_score !== null ? (
                    <span className={r.tajweed_score >= 90 ? "text-success font-semibold" : ""}>
                      {r.tajweed_score}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.assessed_at
                    ? new Date(r.assessed_at).toLocaleDateString("ar-KW")
                    : "—"}
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <MemorizationFormDialog
                      id={r.id}
                      surahs={surahs}
                      students={students}
                      initial={{
                        student_id: r.student_id,
                        surah_number: r.surah_number,
                        from_ayah: r.from_ayah,
                        to_ayah: r.to_ayah,
                        status: r.status,
                        score: r.score,
                        tajweed_score: r.tajweed_score,
                        assessed_at: r.assessed_at,
                      }}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
