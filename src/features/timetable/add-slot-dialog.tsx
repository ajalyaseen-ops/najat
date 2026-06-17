"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { timetableSlotSchema, type TimetableSlotInput } from "./schema";
import { createTimetableSlot } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

// Day labels (Kuwaiti school week: Sun–Thu = 0–4; Fri/Sat off)
export const DAY_LABELS: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

/** Days shown in the Kuwaiti timetable grid (Sun-Thu). */
export const SCHOOL_DAYS = [0, 1, 2, 3, 4] as const;

type Option = { id: string; label: string };

export function AddSlotDialog({
  classId,
  periods,
  subjects,
  staff,
  rooms,
}: {
  classId: string;
  periods: Option[];
  subjects: Option[];
  staff: Option[];
  rooms: Option[];
}) {
  const [open, setOpen] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimetableSlotInput>({
    resolver: zodResolver(timetableSlotSchema),
    defaultValues: {
      class_id: classId,
      day_of_week: 0,
      subject_id: null,
      staff_id: null,
      room_id: null,
    },
  });

  // Keep class_id in sync if classId prop changes (e.g. class switcher)
  const fieldCls = "space-y-1.5";

  async function onSubmit(values: TimetableSlotInput) {
    const res = await createTimetableSlot({ ...values, class_id: classId });
    if (res.ok) {
      toast.success("تم إضافة الحصة بنجاح");
      setOpen(false);
      reset({ class_id: classId, day_of_week: 0, subject_id: null, staff_id: null, room_id: null });
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          إضافة حصة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة حصة دراسية</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Day */}
          <div className={fieldCls}>
            <Label>اليوم *</Label>
            <Select
              value={String(watch("day_of_week") ?? 0)}
              onValueChange={(v) => setValue("day_of_week", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className={fieldCls}>
            <Label>الحصة *</Label>
            <Select
              value={watch("period_id") ?? ""}
              onValueChange={(v) => setValue("period_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحصة" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.period_id && (
              <p className="text-xs text-destructive">{errors.period_id.message}</p>
            )}
          </div>

          {/* Subject */}
          <div className={fieldCls}>
            <Label>المادة</Label>
            <Select
              value={watch("subject_id") ?? "none"}
              onValueChange={(v) => setValue("subject_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff */}
          <div className={fieldCls}>
            <Label>المعلم</Label>
            <Select
              value={watch("staff_id") ?? "none"}
              onValueChange={(v) => setValue("staff_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room */}
          <div className={fieldCls}>
            <Label>القاعة</Label>
            <Select
              value={watch("room_id") ?? "none"}
              onValueChange={(v) => setValue("room_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin h-4 w-4" />} حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
