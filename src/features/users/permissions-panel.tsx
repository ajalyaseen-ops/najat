"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type Role, type Permission } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Groups permissions into human-readable categories for display. */
const PERM_GROUP_LABELS: Record<string, string> = {
  students: "الطلاب",
  teachers: "المعلمون",
  classes: "الفصول",
  subjects: "المواد الدراسية",
  departments: "الأقسام",
  attendance: "الحضور والغياب",
  grades: "الدرجات",
  timetable: "الجدول الدراسي",
  curriculum: "المنهج الدراسي",
  islamic: "التربية الإسلامية",
  behavior: "السلوك",
  observations: "الملاحظات الصفية",
  activities: "الأنشطة",
  reports: "التقارير",
  communication: "التواصل",
  analytics: "التحليلات",
  finance: "المالية",
  settings: "إعدادات النظام",
  branding: "هوية المدرسة",
  users: "المستخدمون",
  audit: "سجل التدقيق",
};

const ACTION_LABELS: Record<string, string> = {
  read: "عرض",
  write: "تعديل",
  delete: "حذف",
  import: "استيراد",
  send: "إرسال",
  manage: "إدارة",
};

function groupPermissions(perms: Permission[] | ["*"]) {
  if ((perms as string[]).includes("*")) return null; // wildcard
  const groups: Record<string, string[]> = {};
  for (const p of perms as Permission[]) {
    const [resource, action] = p.split(":");
    if (!groups[resource]) groups[resource] = [];
    groups[resource].push(action);
  }
  return groups;
}

export function PermissionsPanel() {
  const [selectedRole, setSelectedRole] = useState<Role>("teacher");
  const [expanded, setExpanded] = useState(true);

  const perms = ROLE_PERMISSIONS[selectedRole];
  const groups = groupPermissions(perms);
  const isWildcard = groups === null;

  return (
    <Card className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-base">مرجع الصلاحيات حسب الدور</h2>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "طي" : "توسيع"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">اختر الدور</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <SelectTrigger className="w-full max-w-xs">
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

          {isWildcard ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <Star className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                صلاحية كاملة على جميع الموارد (wildcard *)
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groups).map(([resource, actions]) => (
                <div
                  key={resource}
                  className="rounded-lg border bg-muted/40 px-3 py-2.5 space-y-1.5"
                >
                  <p className="text-xs font-semibold text-foreground">
                    {PERM_GROUP_LABELS[resource] ?? resource}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {actions.map((action) => (
                      <Badge key={action} variant="secondary" className="text-xs">
                        {ACTION_LABELS[action] ?? action}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            هذه الصلاحيات الافتراضية مُعرَّفة في النظام. يمكن تخصيصها على مستوى المدرسة.
          </p>
        </>
      )}
    </Card>
  );
}
