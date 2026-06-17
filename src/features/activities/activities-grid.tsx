"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Banknote,
  MoreHorizontal,
  Pencil,
  Trash2,
  PlusCircle,
  Search,
} from "lucide-react";
import { deleteActivity } from "./actions";
import { ActivityFormDialog } from "./activity-form";
import { KIND_LABELS, type ActivityKind, type ActivityInput } from "./schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ActivityRow = ActivityInput & {
  id: string;
  participantCount: number;
  supervisorName: string | null;
};

type SupervisorOption = { id: string; full_name: string | null };

const KIND_COLORS: Record<string, string> = {
  summer_club: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  camp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  competition: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  sport: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  trip: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

function kindLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  return KIND_LABELS[kind as ActivityKind] ?? kind;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-KW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ActivitiesGrid({
  rows,
  supervisors,
  canWrite,
}: {
  rows: ActivityRow[];
  supervisors: SupervisorOption[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.description, r.kind, r.supervisorName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function onDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا النشاط؟")) return;
    const res = await deleteActivity(id);
    if (res.ok) toast.success("تم الحذف بنجاح");
    else toast.error("حدث خطأ أثناء الحذف");
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
            placeholder="بحث في الأنشطة…"
            className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {canWrite && (
          <ActivityFormDialog
            supervisors={supervisors}
            trigger={
              <Button>
                <PlusCircle /> إضافة نشاط
              </Button>
            }
          />
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 text-muted-foreground">
          <PlusCircle className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">لا توجد أنشطة مسجلة</p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((row) => {
          const colorClass =
            KIND_COLORS[row.kind ?? ""] ??
            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
          const fillPct =
            row.capacity && row.capacity > 0
              ? Math.min(100, Math.round((row.participantCount / row.capacity) * 100))
              : null;

          return (
            <Card key={row.id} className="rounded-xl transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="flex-1 space-y-1">
                  <CardTitle className="text-base leading-snug">{row.name}</CardTitle>
                  {row.kind && (
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
                    >
                      {kindLabel(row.kind)}
                    </span>
                  )}
                </div>
                {canWrite && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ActivityFormDialog
                        id={row.id}
                        supervisors={supervisors}
                        initial={row}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Pencil className="me-2 h-3.5 w-3.5" /> تعديل
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="me-2 h-3.5 w-3.5" /> حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {row.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {row.description}
                  </p>
                )}

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {formatDate(row.start_date)}
                      {row.end_date && row.end_date !== row.start_date && (
                        <> — {formatDate(row.end_date)}</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {row.participantCount} مشارك
                      {row.capacity ? (
                        <span className="ms-1 text-xs opacity-70">
                          / {row.capacity}
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {(row.fee ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 shrink-0" />
                      <span dir="ltr" className="text-start">
                        {Number(row.fee).toFixed(3)} KD
                      </span>
                    </div>
                  )}
                </div>

                {/* Capacity bar */}
                {fillPct !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>الإشغال</span>
                      <span>{fillPct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          fillPct >= 90
                            ? "bg-destructive"
                            : fillPct >= 70
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {row.supervisorName && (
                  <p className="text-xs text-muted-foreground">
                    المشرف: {row.supervisorName}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
