"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import type { Locale } from "@/i18n/config";

export type AuditLogRow = {
  id: number;
  created_at: string;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
};

/** Map action prefix to a Badge variant for visual scanning. */
function actionVariant(action: string): "success" | "destructive" | "warning" | "secondary" {
  if (action.includes(".create") || action.includes(".insert")) return "success";
  if (action.includes(".delete") || action.includes(".archive") || action.includes(".remove"))
    return "destructive";
  if (action.includes(".update") || action.includes(".edit") || action.includes(".change"))
    return "warning";
  return "secondary";
}

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.action, r.entity, r.entity_id, r.user_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث في الإجراءات…"
          className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ والوقت</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>الإجراء</TableHead>
              <TableHead>الجدول</TableHead>
              <TableHead>المعرّف</TableHead>
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
                {/* Date + time */}
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground" dir="ltr">
                  {formatDate(r.created_at, locale, "gregorian", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>

                {/* User email */}
                <TableCell className="text-sm" dir="ltr">
                  {r.user_email ?? "—"}
                </TableCell>

                {/* Action badge */}
                <TableCell>
                  <Badge variant={actionVariant(r.action)} className="font-mono text-xs">
                    {r.action}
                  </Badge>
                </TableCell>

                {/* Entity table */}
                <TableCell className="text-sm">
                  {r.entity ?? "—"}
                </TableCell>

                {/* Entity ID */}
                <TableCell className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {r.entity_id ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Row count hint */}
      {filtered.length > 0 && (
        <p className="text-end text-xs text-muted-foreground">
          {filtered.length !== rows.length
            ? `${filtered.length} من ${rows.length} سجل`
            : `${rows.length} سجل`}
        </p>
      )}
    </div>
  );
}
