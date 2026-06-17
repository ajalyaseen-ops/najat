"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Archive, Search, BookOpen } from "lucide-react";
import { archiveClass } from "./actions";
import { ClassFormDialog } from "./class-form";
import type { ClassInput } from "./schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ClassRow = ClassInput & {
  id: string;
  student_count: number;
  gradeLevelName: string | null;
  teacherName: string | null;
};

export type GradeLevelOption = { id: string; name_ar: string };
export type AcademicYearOption = { id: string; name: string };
export type StaffOption = { id: string; name_ar: string };

const STATUS_VARIANT: Record<string, "success" | "warning"> = {
  active: "success",
  archived: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  archived: "مؤرشف",
};

export function ClassesTable({
  rows,
  gradeLevels,
  academicYears,
  staff,
  canWrite,
}: {
  rows: ClassRow[];
  gradeLevels: GradeLevelOption[];
  academicYears: AcademicYearOption[];
  staff: StaffOption[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.gradeLevelName, r.teacherName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function onArchive(id: string) {
    const res = await archiveClass(id);
    if (res.ok) toast.success("تم الأرشفة بنجاح");
    else toast.error("حدث خطأ");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث…"
            className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {canWrite && (
          <ClassFormDialog
            gradeLevels={gradeLevels}
            academicYears={academicYears}
            staff={staff}
            trigger={
              <Button>
                <BookOpen /> إضافة فصل
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم الفصل</TableHead>
              <TableHead>الصف الدراسي</TableHead>
              <TableHead>رائد الفصل</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">السعة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.gradeLevelName ?? "—"}</TableCell>
                <TableCell>{r.teacherName ?? "—"}</TableCell>
                <TableCell className="text-center">{r.student_count}</TableCell>
                <TableCell className="text-center">{r.capacity}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ClassFormDialog
                          id={r.id}
                          gradeLevels={gradeLevels}
                          academicYears={academicYears}
                          staff={staff}
                          initial={r}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil /> تعديل
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onArchive(r.id)}
                        >
                          <Archive /> أرشفة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
