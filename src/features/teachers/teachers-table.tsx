"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Archive, Search, UserPlus, BookOpen } from "lucide-react";
import { archiveTeacher } from "./actions";
import { TeacherFormDialog } from "./teacher-form";
import type { TeacherInput } from "./schema";
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

export type TeacherRow = TeacherInput & {
  id: string;
  departmentName: string | null;
  teachingLoad: number;
};

type DeptOption = { id: string; name_ar: string; name_en: string | null };

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  archived: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  archived: "مؤرشف",
};

export function TeachersTable({
  rows,
  departments,
  canWrite,
}: {
  rows: TeacherRow[];
  departments: DeptOption[];
  canWrite: boolean;
}) {
  const t = useTranslations("teachers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name_ar, r.name_en, r.employee_no, r.email, r.mobile, r.position, r.departmentName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function onArchive(id: string) {
    const res = await archiveTeacher(id);
    if (res.ok) toast.success(tc("saved"));
    else toast.error(tc("error"));
  }

  return (
    <div className="space-y-4">
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
          <TeacherFormDialog
            departments={departments}
            trigger={
              <Button>
                <UserPlus /> {t("addTeacher")}
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden md:table-cell">{t("employeeId")}</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead className="hidden md:table-cell">{t("department")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("position")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("teachingLoad")}
                </span>
              </TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell dir="ltr" className="hidden text-start font-mono text-sm md:table-cell">
                  {r.employee_no ?? "—"}
                </TableCell>
                <TableCell className="font-medium">
                  {locale === "en" && r.name_en ? r.name_en : r.name_ar}
                  {r.mobile && (
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {r.mobile}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{r.departmentName ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">{r.position ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {r.teachingLoad > 0 ? (
                    <Badge variant="secondary">
                      {r.teachingLoad} {r.teachingLoad === 1 ? "تكليف" : "تكليفات"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
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
                        <TeacherFormDialog
                          id={r.id}
                          departments={departments}
                          initial={r}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil /> {tc("edit")}
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onArchive(r.id)}
                        >
                          <Archive /> {tc("archive")}
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
