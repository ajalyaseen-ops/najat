"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { DAY_LABELS, SCHOOL_DAYS, AddSlotDialog } from "./add-slot-dialog";
import { deleteTimetableSlot } from "./actions";
import { Badge } from "@/components/ui/badge";

export type SlotRow = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string | null;
  staff_name: string | null;
  room_name: string | null;
};

export type PeriodOption = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
};

type Option = { id: string; label: string };

export function TimetableGrid({
  classId,
  slots,
  periods,
  subjects,
  staff,
  rooms,
  canWrite,
}: {
  classId: string;
  slots: SlotRow[];
  periods: PeriodOption[];
  subjects: Option[];
  staff: Option[];
  rooms: Option[];
  canWrite: boolean;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build a lookup: period_id → day_of_week → SlotRow
  const grid: Record<string, Record<number, SlotRow>> = {};
  for (const slot of slots) {
    if (!grid[slot.period_id]) grid[slot.period_id] = {};
    grid[slot.period_id][slot.day_of_week] = slot;
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    const res = await deleteTimetableSlot(id);
    setDeletingId(null);
    if (res.ok) toast.success("تم حذف الحصة");
    else toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
  }

  if (periods.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-20 text-center text-muted-foreground">
        لا توجد حصص مُعرَّفة. يُرجى إضافة الحصص أولاً من إعدادات الجدول.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <AddSlotDialog
            classId={classId}
            periods={periods}
            subjects={subjects}
            staff={staff}
            rooms={rooms}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-start font-semibold text-muted-foreground w-36">
                الحصة / الوقت
              </th>
              {SCHOOL_DAYS.map((day) => (
                <th
                  key={day}
                  className="px-3 py-3 text-center font-semibold text-muted-foreground"
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period, idx) => (
              <tr
                key={period.id}
                className={idx % 2 === 0 ? "border-b" : "border-b bg-muted/10"}
              >
                {/* Period label column */}
                <td className="px-4 py-3 align-top">
                  <p className="font-medium">{period.label}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {period.start_time.slice(0, 5)} – {period.end_time.slice(0, 5)}
                  </p>
                </td>

                {SCHOOL_DAYS.map((day) => {
                  const slot = grid[period.id]?.[day];
                  return (
                    <td key={day} className="px-2 py-2 align-top text-center">
                      {slot ? (
                        <div className="group relative mx-auto flex max-w-[130px] flex-col items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-2">
                          {slot.subject_name && (
                            <span className="text-xs font-semibold leading-tight">
                              {slot.subject_name}
                            </span>
                          )}
                          {slot.staff_name && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {slot.staff_name}
                            </Badge>
                          )}
                          {slot.room_name && (
                            <span className="text-[10px] text-muted-foreground">
                              {slot.room_name}
                            </span>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => onDelete(slot.id)}
                              disabled={deletingId === slot.id}
                              className="absolute -end-2 -top-2 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:flex"
                              aria-label="حذف الحصة"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        إجمالي الحصص المُجدولة: <strong>{slots.length}</strong>
      </p>
    </div>
  );
}
