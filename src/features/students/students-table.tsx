"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Archive, Search, UserPlus } from "lucide-react";
import { archiveStudent } from "./actions";
import { StudentFormDialog } from "./student-form";
import type { StudentInput } from "./schema";
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

export type StudentRow = StudentInput & {
  id: string;
  className: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  enrolled: "success",
  transferred: "secondary",
  withdrawn: "destructive",
  graduated: "secondary",
  archived: "warning",
};

export function StudentsTable({
  rows,
  classes,
  canWrite,
}: {
  rows: StudentRow[];
  classes: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name_ar, r.name_en, r.ministry_no, r.civil_id, r.guardian_mobile]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function onArchive(id: string) {
    const res = await archiveStudent(id);
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
          <StudentFormDialog
            classes={classes}
            trigger={
              <Button>
                <UserPlus /> {t("addStudent")}
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("nameAr")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("ministryNumber")}</TableHead>
              <TableHead>{t("class")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("mobile")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {locale === "en" && r.name_en ? r.name_en : r.name_ar}
                </TableCell>
                <TableCell dir="ltr" className="hidden text-start md:table-cell">{r.ministry_no ?? "—"}</TableCell>
                <TableCell>{r.className ?? "—"}</TableCell>
                <TableCell dir="ltr" className="hidden text-start lg:table-cell">{r.guardian_mobile ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                    {t(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (`status${r.status.charAt(0).toUpperCase()}${r.status.slice(1)}`) as any
                    )}
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
                        <StudentFormDialog
                          id={r.id}
                          classes={classes}
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
