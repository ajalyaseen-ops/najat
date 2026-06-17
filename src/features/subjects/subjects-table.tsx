"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Search, BookPlus } from "lucide-react";
import { archiveSubject } from "./actions";
import { SubjectFormDialog } from "./subject-form";
import type { SubjectInput } from "./schema";
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

export type SubjectRow = SubjectInput & {
  id: string;
  departmentName: string | null;
};

export function SubjectsTable({
  rows,
  departments,
  canWrite,
}: {
  rows: SubjectRow[];
  departments: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name_ar, r.name_en, r.code, r.departmentName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function onDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    const res = await archiveSubject(id);
    if (res.ok) toast.success("تم الحذف");
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
          <SubjectFormDialog
            departments={departments}
            trigger={
              <Button>
                <BookPlus /> إضافة مادة
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المادة</TableHead>
              <TableHead className="hidden md:table-cell">الرمز</TableHead>
              <TableHead className="hidden md:table-cell">القسم</TableHead>
              <TableHead className="hidden lg:table-cell">الحصص الأسبوعية</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {locale === "en" && r.name_en ? r.name_en : r.name_ar}
                  {r.name_en && locale !== "en" && (
                    <span className="ms-2 text-xs text-muted-foreground">{r.name_en}</span>
                  )}
                </TableCell>
                <TableCell dir="ltr" className="hidden text-start font-mono text-sm md:table-cell">
                  {r.code}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.departmentName ? (
                    <Badge variant="secondary">{r.departmentName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell dir="ltr" className="hidden text-start lg:table-cell">
                  {r.weekly_periods}
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
                        <SubjectFormDialog
                          id={r.id}
                          departments={departments}
                          initial={r}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
