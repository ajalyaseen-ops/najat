"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Archive, Search, PlusCircle, Users, BookOpen } from "lucide-react";
import { archiveDepartment } from "./actions";
import { DepartmentFormDialog } from "./department-form";
import type { DepartmentInput } from "./schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export type DepartmentRow = DepartmentInput & {
  id: string;
  headName: string | null;
  staffCount: number;
  subjectCount: number;
};

export type StaffOption = { id: string; name: string };

export function DepartmentsTable({
  rows,
  staff,
  canWrite,
}: {
  rows: DepartmentRow[];
  staff: StaffOption[];
  canWrite: boolean;
}) {
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name_ar, r.name_en, r.headName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  const totalStaff = rows.reduce((sum, r) => sum + r.staffCount, 0);
  const totalSubjects = rows.reduce((sum, r) => sum + r.subjectCount, 0);

  async function onArchive(id: string) {
    const res = await archiveDepartment(id);
    if (res.ok) toast.success("تم الأرشفة");
    else toast.error("حدث خطأ");
  }

  const isArchived = (r: DepartmentRow) => r.name_ar.startsWith("[مؤرشف]");

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rows.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي الأقسام</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStaff}</p>
              <p className="text-sm text-muted-foreground">إجمالي أعضاء الهيئة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <BookOpen className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSubjects}</p>
              <p className="text-sm text-muted-foreground">إجمالي المواد</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث..."
            className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {canWrite && (
          <DepartmentFormDialog
            staff={staff}
            trigger={
              <Button>
                <PlusCircle /> إضافة قسم
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
              <TableHead>اسم القسم</TableHead>
              <TableHead>رئيس القسم</TableHead>
              <TableHead className="text-center">أعضاء الهيئة</TableHead>
              <TableHead className="text-center">المواد</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id} className={isArchived(r) ? "opacity-50" : undefined}>
                <TableCell className="font-medium">
                  {locale === "en" && r.name_en ? r.name_en : r.name_ar}
                  {r.name_en && locale !== "en" && (
                    <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                      {r.name_en}
                    </span>
                  )}
                </TableCell>
                <TableCell>{r.headName ?? "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{r.staffCount}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{r.subjectCount}</Badge>
                </TableCell>
                <TableCell>
                  {isArchived(r) ? (
                    <Badge variant="warning">مؤرشف</Badge>
                  ) : (
                    <Badge variant="success">نشط</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canWrite && !isArchived(r) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DepartmentFormDialog
                          id={r.id}
                          staff={staff}
                          initial={{
                            name_ar: r.name_ar,
                            name_en: r.name_en,
                            head_id: r.head_id,
                          }}
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
