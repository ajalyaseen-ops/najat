"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Search, Plus } from "lucide-react";
import { deleteBehaviorRecord } from "./actions";
import { BehaviorFormDialog } from "./behavior-form";
import type { BehaviorInput } from "./schema";
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

export type BehaviorRow = {
  id: string;
  student_id: string;
  studentName: string | null;
  kind: "positive" | "negative";
  category: string;
  description: string | null;
  action_taken: string | null;
  date: string;
  points: number;
};

type StudentOption = { id: string; name_ar: string };

type KindFilter = "all" | "positive" | "negative";

export function BehaviorTable({
  rows,
  students,
  canWrite,
}: {
  rows: BehaviorRow[];
  students: StudentOption[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!q) return true;
      return [r.studentName, r.category, r.description, r.action_taken]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, query, kindFilter]);

  async function onDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    const res = await deleteBehaviorRecord(id);
    if (res.ok) toast.success("تم الحذف");
    else toast.error("حدث خطأ أثناء الحذف");
  }

  const FILTER_TABS: { value: KindFilter; label: string }[] = [
    { value: "all", label: "الكل" },
    { value: "positive", label: "إيجابي" },
    { value: "negative", label: "سلبي" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Kind filter tabs */}
        <div className="flex rounded-lg border bg-muted p-1 gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setKindFilter(tab.value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                kindFilter === tab.value
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث…"
              className="h-10 w-56 rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Add button */}
          {canWrite && (
            <BehaviorFormDialog
              students={students}
              trigger={
                <Button>
                  <Plus /> إضافة سجل
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 text-sm text-muted-foreground">
        <span>
          إجمالي:{" "}
          <span className="font-medium text-foreground">{rows.length}</span>
        </span>
        <span>
          إيجابي:{" "}
          <span className="font-medium text-success">
            {rows.filter((r) => r.kind === "positive").length}
          </span>
        </span>
        <span>
          سلبي:{" "}
          <span className="font-medium text-destructive">
            {rows.filter((r) => r.kind === "negative").length}
          </span>
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الطالب</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الفئة</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>الإجراء المتخذ</TableHead>
              <TableHead>النقاط</TableHead>
              <TableHead>التاريخ</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 8 : 7}
                  className="py-10 text-center text-muted-foreground"
                >
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const rowInitial: Partial<BehaviorInput> = {
                student_id: r.student_id,
                kind: r.kind,
                category: r.category,
                description: r.description,
                action_taken: r.action_taken,
                date: r.date,
                points: r.points,
              };
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.studentName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.kind === "positive" ? "success" : "destructive"}
                    >
                      {r.kind === "positive" ? "إيجابي" : "سلبي"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {r.description ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground">
                    {r.action_taken ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        r.points > 0
                          ? "font-semibold text-success"
                          : r.points < 0
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {r.points > 0 ? `+${r.points}` : r.points}
                    </span>
                  </TableCell>
                  <TableCell dir="ltr" className="text-start text-sm">
                    {r.date}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <BehaviorFormDialog
                            id={r.id}
                            students={students}
                            initial={rowInitial}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil /> تعديل
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(r.id)}
                          >
                            <Trash2 /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
