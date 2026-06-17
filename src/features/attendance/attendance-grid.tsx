"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Stethoscope, FileCheck, Users } from "lucide-react";
import { saveOneAttendance, markAllPresent } from "./actions";
import type { AttendanceStatus } from "./schema";
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

export type StudentRosterRow = {
  id: string;
  name_ar: string;
  name_en: string | null;
  currentStatus: AttendanceStatus | null;
  attendanceId: string | null;
};

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { labelAr: string; color: string; icon: React.ReactNode }
> = {
  present: {
    labelAr: "حاضر",
    color:
      "bg-success/15 text-success border-success/30 hover:bg-success/25 data-[active=true]:bg-success data-[active=true]:text-white",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  absent: {
    labelAr: "غائب",
    color:
      "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 data-[active=true]:bg-destructive data-[active=true]:text-white",
    icon: <XCircle className="h-4 w-4" />,
  },
  late: {
    labelAr: "متأخر",
    color:
      "bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/20 data-[active=true]:bg-warning data-[active=true]:text-warning-foreground",
    icon: <Clock className="h-4 w-4" />,
  },
  excused: {
    labelAr: "بعذر",
    color:
      "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
    icon: <FileCheck className="h-4 w-4" />,
  },
  medical: {
    labelAr: "مرضية",
    color:
      "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 data-[active=true]:bg-blue-600 data-[active=true]:text-white dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    icon: <Stethoscope className="h-4 w-4" />,
  },
};

const STATUS_ORDER: AttendanceStatus[] = ["present", "absent", "late", "excused", "medical"];

function statusBadgeVariant(
  s: AttendanceStatus | null
): "success" | "destructive" | "warning" | "secondary" | "default" {
  if (!s) return "secondary";
  const map: Record<AttendanceStatus, "success" | "destructive" | "warning" | "secondary"> = {
    present: "success",
    absent: "destructive",
    late: "warning",
    excused: "secondary",
    medical: "secondary",
  };
  return map[s];
}

export function AttendanceGrid({
  students,
  classId,
  date,
  canWrite,
}: {
  students: StudentRosterRow[];
  classId: string;
  date: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Local optimistic state: map student_id -> status
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      if (s.currentStatus) init[s.id] = s.currentStatus;
    }
    return init;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleStatusClick = useCallback(
    (studentId: string, newStatus: AttendanceStatus) => {
      if (!canWrite) return;
      // Optimistic update
      setLocalStatuses((prev) => ({ ...prev, [studentId]: newStatus }));
      setSaving((prev) => ({ ...prev, [studentId]: true }));

      startTransition(async () => {
        const res = await saveOneAttendance({
          student_id: studentId,
          class_id: classId,
          date,
          status: newStatus,
        });
        setSaving((prev) => ({ ...prev, [studentId]: false }));
        if (!res.ok) {
          toast.error("حدث خطأ أثناء الحفظ");
          // Revert optimistic update
          setLocalStatuses((prev) => {
            const reverted = { ...prev };
            const original = students.find((s) => s.id === studentId)?.currentStatus;
            if (original) reverted[studentId] = original;
            else delete reverted[studentId];
            return reverted;
          });
        }
      });
    },
    [canWrite, classId, date, students]
  );

  const handleMarkAllPresent = useCallback(() => {
    if (!canWrite) return;
    // Optimistic: mark all present
    const all: Record<string, AttendanceStatus> = {};
    for (const s of students) all[s.id] = "present";
    setLocalStatuses(all);

    startTransition(async () => {
      const res = await markAllPresent(classId, date);
      if (!res.ok) {
        toast.error("حدث خطأ أثناء تعيين الكل حاضر");
        // Revert
        const original: Record<string, AttendanceStatus> = {};
        for (const s of students) {
          if (s.currentStatus) original[s.id] = s.currentStatus;
        }
        setLocalStatuses(original);
      } else {
        toast.success("تم تعيين الكل حاضراً");
      }
    });
  }, [canWrite, classId, date, students]);

  // Summary counts
  const counts = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = Object.values(localStatuses).filter((v) => v === s).length;
      return acc;
    },
    {} as Record<AttendanceStatus, number>
  );
  const unmarked = students.length - Object.keys(localStatuses).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{students.length} طالب</span>
        </div>
        <div className="ms-2 flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <Badge key={s} variant={statusBadgeVariant(s)} className="gap-1">
              {STATUS_CONFIG[s].labelAr}: {counts[s]}
            </Badge>
          ))}
          {unmarked > 0 && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              لم يُرصد: {unmarked}
            </Badge>
          )}
        </div>
        {canWrite && (
          <Button
            size="sm"
            variant="outline"
            className="ms-auto"
            onClick={handleMarkAllPresent}
            disabled={pending}
          >
            <CheckCircle2 className="h-4 w-4" />
            تعيين الكل حاضر
          </Button>
        )}
      </div>

      {/* Roster grid */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>اسم الطالب</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  لا يوجد طلاب في هذا الفصل
                </TableCell>
              </TableRow>
            )}
            {students.map((student, idx) => {
              const currentStatus = localStatuses[student.id] ?? null;
              const isSaving = saving[student.id] ?? false;

              return (
                <TableRow key={student.id} className={isSaving ? "opacity-60" : undefined}>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{student.name_ar}</TableCell>
                  <TableCell>
                    {canWrite ? (
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_ORDER.map((s) => {
                          const cfg = STATUS_CONFIG[s];
                          const isActive = currentStatus === s;
                          return (
                            <button
                              key={s}
                              data-active={isActive}
                              onClick={() => handleStatusClick(student.id, s)}
                              disabled={isSaving || pending}
                              className={[
                                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                                cfg.color,
                                isSaving || pending ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                              ].join(" ")}
                            >
                              {cfg.icon}
                              {cfg.labelAr}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Badge variant={statusBadgeVariant(currentStatus)}>
                        {currentStatus ? STATUS_CONFIG[currentStatus].labelAr : "—"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
