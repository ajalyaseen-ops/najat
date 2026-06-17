"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Search, ClipboardList } from "lucide-react";
import { ObservationFormDialog } from "./observation-form";
import type { ObservationInput } from "./schema";
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

export type ObservationRow = {
  id: string;
  date: string;
  overall_score: number | null;
  status: "draft" | "submitted" | "acknowledged";
  strengths: string | null;
  improvements: string | null;
  development_plan: string | null;
  staff_id: string;
  class_id: string | null;
  subject_id: string | null;
  teacherName: string | null;
  className: string | null;
  subjectName: string | null;
};

type StaffOption = { id: string; name_ar: string };
type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name_ar: string };

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُرسلة",
  acknowledged: "مُعتمدة",
};

const STATUS_VARIANT: Record<
  string,
  "secondary" | "warning" | "success"
> = {
  draft: "secondary",
  submitted: "warning",
  acknowledged: "success",
};

export function ObservationsTable({
  rows,
  staff,
  classes,
  subjects,
  canWrite,
}: {
  rows: ObservationRow[];
  staff: StaffOption[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  canWrite: boolean;
}) {
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.teacherName, r.className, r.subjectName, r.date]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  function toInput(r: ObservationRow): Partial<ObservationInput> {
    return {
      staff_id: r.staff_id,
      class_id: r.class_id,
      subject_id: r.subject_id,
      date: r.date,
      overall_score: r.overall_score,
      strengths: r.strengths,
      improvements: r.improvements,
      development_plan: r.development_plan,
      status: r.status,
    };
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tc("search")}
            className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {canWrite && (
          <ObservationFormDialog
            staff={staff}
            classes={classes}
            subjects={subjects}
            trigger={
              <Button>
                <ClipboardList /> إضافة ملاحظة
              </Button>
            }
          />
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المعلم</TableHead>
              <TableHead className="hidden md:table-cell">التاريخ</TableHead>
              <TableHead className="hidden md:table-cell">الفصل</TableHead>
              <TableHead className="hidden lg:table-cell">المادة</TableHead>
              <TableHead className="hidden lg:table-cell">التقييم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  {tc("noData")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.teacherName ?? "—"}
                </TableCell>
                <TableCell dir="ltr" className="hidden text-start md:table-cell">
                  {r.date}
                </TableCell>
                <TableCell className="hidden md:table-cell">{r.className ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">{r.subjectName ?? "—"}</TableCell>
                <TableCell dir="ltr" className="hidden text-start lg:table-cell">
                  {r.overall_score != null ? r.overall_score : "—"}
                </TableCell>
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
                        <ObservationFormDialog
                          id={r.id}
                          staff={staff}
                          classes={classes}
                          subjects={subjects}
                          initial={toInput(r)}
                          trigger={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Pencil /> {tc("edit")}
                            </DropdownMenuItem>
                          }
                        />
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
