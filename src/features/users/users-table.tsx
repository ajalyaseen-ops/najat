"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, ShieldCheck } from "lucide-react";
import { changeUserRole } from "./actions";
import type { Role } from "@/lib/rbac";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "success";

const ROLE_BADGE_VARIANT: Partial<Record<Role, BadgeVariant>> = {
  super_admin: "destructive",
  principal: "default",
  vice_principal: "default",
  department_head: "secondary",
  teacher: "secondary",
  registrar: "secondary",
  finance_officer: "warning",
  auditor: "outline",
  activity_supervisor: "secondary",
  student: "success",
  parent: "outline",
};

function ChangeRoleDialog({
  user,
  currentUserId,
}: {
  user: UserRow;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(user.role);
  const [isPending, startTransition] = useTransition();

  const isSelf = user.id === currentUserId;

  function handleSave() {
    startTransition(async () => {
      const res = await changeUserRole({ profileId: user.id, role: selectedRole });
      if (res.ok) {
        toast.success("تم تغيير الدور بنجاح");
        setOpen(false);
      } else {
        toast.error(res.error === "forbidden" ? "ليس لديك صلاحية" : res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isSelf} title={isSelf ? "لا يمكنك تغيير دورك الخاص" : undefined}>
          <ShieldCheck className="h-4 w-4" />
          <span className="sr-only">تغيير الدور</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تغيير دور المستخدم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            المستخدم: <span className="font-medium text-foreground">{user.full_name ?? user.email ?? "—"}</span>
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">الدور الجديد</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r].ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isPending || selectedRole === user.role}>
            {isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersTable({
  rows,
  canWrite,
  currentUserId,
}: {
  rows: UserRow[];
  canWrite: boolean;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.email, ROLE_LABELS[r.role]?.ar]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث…"
          className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم الكامل</TableHead>
              <TableHead className="hidden md:table-cell">البريد الإلكتروني</TableHead>
              <TableHead>الدور</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 4 : 3} className="py-10 text-center text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name ?? "—"}</TableCell>
                <TableCell dir="ltr" className="hidden text-start text-muted-foreground md:table-cell">
                  {r.email ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[r.role] ?? "secondary"}>
                    {ROLE_LABELS[r.role]?.ar ?? r.role}
                  </Badge>
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <ChangeRoleDialog user={r} currentUserId={currentUserId} />
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
