"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Megaphone, Search } from "lucide-react";
import { deleteAnnouncement } from "./actions";
import { AnnouncementFormDialog } from "./announcement-form";
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
import { MoreHorizontal } from "lucide-react";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  audience: string;
  published_at: string | null;
  created_at: string;
  creator_name: string | null;
};

const AUDIENCE_LABEL: Record<string, string> = {
  all: "الجميع",
  teachers: "المعلمون",
  parents: "أولياء الأمور",
  students: "الطلاب",
};

const AUDIENCE_VARIANT: Record<string, "default" | "secondary" | "warning" | "success"> = {
  all: "default",
  teachers: "secondary",
  parents: "warning",
  students: "success",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AnnouncementsTable({
  rows,
  canWrite,
}: {
  rows: AnnouncementRow[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.title, r.body, r.creator_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query.trim().toLowerCase()))
      )
    : rows;

  async function onDelete(id: string) {
    if (!confirm("هل تريد حذف هذا الإعلان؟")) return;
    const res = await deleteAnnouncement(id);
    if (res.ok) toast.success("تم حذف الإعلان");
    else toast.error("حدث خطأ أثناء الحذف");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث في الإعلانات…"
            className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {canWrite && (
          <AnnouncementFormDialog
            trigger={
              <Button>
                <Megaphone /> إعلان جديد
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>عنوان الإعلان</TableHead>
              <TableHead>الجمهور</TableHead>
              <TableHead>المرسِل</TableHead>
              <TableHead>تاريخ النشر</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="py-10 text-center text-muted-foreground"
                >
                  لا توجد إعلانات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium max-w-xs">
                  <div className="truncate">{r.title}</div>
                  {r.body && (
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{r.body}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={AUDIENCE_VARIANT[r.audience] ?? "secondary"}>
                    {AUDIENCE_LABEL[r.audience] ?? r.audience}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.creator_name ?? "—"}</TableCell>
                <TableCell className="text-sm">{formatDateTime(r.published_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(r.created_at)}
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
