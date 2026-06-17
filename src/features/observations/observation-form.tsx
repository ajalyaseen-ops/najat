"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { observationSchema, type ObservationInput } from "./schema";
import { createObservation, updateObservation } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type StaffOption = { id: string; name_ar: string };
type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name_ar: string };

export function ObservationFormDialog({
  trigger,
  staff,
  classes,
  subjects,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  staff: StaffOption[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  initial?: Partial<ObservationInput>;
  id?: string;
}) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ObservationInput>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      status: "draft",
      date: new Date().toISOString().substring(0, 10),
      ...initial,
    },
  });

  async function onSubmit(values: ObservationInput) {
    const res = id
      ? await updateObservation(id, values)
      : await createObservation(values);
    if (res.ok) {
      toast.success(tc("saved"));
      setOpen(false);
      if (!id) reset();
    } else {
      toast.error(res.error === "forbidden" ? tc("error") : res.error);
    }
  }

  const field = "space-y-1.5";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {id ? "تعديل الملاحظة" : "إضافة ملاحظة صفية"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Teacher / Staff */}
            <div className={field}>
              <Label>المعلم *</Label>
              <Select
                value={watch("staff_id")}
                onValueChange={(v) => setValue("staff_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المعلم" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.staff_id && (
                <p className="text-xs text-destructive">
                  {errors.staff_id.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className={field}>
              <Label>التاريخ *</Label>
              <Input type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Class */}
            <div className={field}>
              <Label>الفصل</Label>
              <Select
                value={watch("class_id") ?? undefined}
                onValueChange={(v) => setValue("class_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className={field}>
              <Label>المادة</Label>
              <Select
                value={watch("subject_id") ?? undefined}
                onValueChange={(v) => setValue("subject_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Overall score */}
            <div className={field}>
              <Label>التقييم الكلي (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                dir="ltr"
                {...register("overall_score")}
              />
            </div>

            {/* Status */}
            <div className={field}>
              <Label>الحالة</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) =>
                  setValue(
                    "status",
                    v as "draft" | "submitted" | "acknowledged"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="submitted">مُرسلة</SelectItem>
                  <SelectItem value="acknowledged">مُعتمدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text areas */}
          <div className={field}>
            <Label>نقاط القوة</Label>
            <textarea
              {...register("strengths")}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="اكتب نقاط القوة الملاحظة…"
            />
          </div>

          <div className={field}>
            <Label>جوانب التحسين</Label>
            <textarea
              {...register("improvements")}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="اكتب الجوانب التي تحتاج إلى تحسين…"
            />
          </div>

          <div className={field}>
            <Label>خطة التطوير</Label>
            <textarea
              {...register("development_plan")}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="اكتب خطة التطوير المهني…"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}{" "}
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
