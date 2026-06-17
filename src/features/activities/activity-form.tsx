"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { activitySchema, type ActivityInput, ACTIVITY_KINDS, KIND_LABELS } from "./schema";
import { createActivity, updateActivity } from "./actions";
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

type SupervisorOption = { id: string; full_name: string | null };

export function ActivityFormDialog({
  trigger,
  initial,
  id,
  supervisors,
}: {
  trigger: React.ReactNode;
  initial?: Partial<ActivityInput>;
  id?: string;
  supervisors: SupervisorOption[];
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityInput>({
    resolver: zodResolver(activitySchema),
    defaultValues: { fee: 0, ...initial },
  });

  async function onSubmit(values: ActivityInput) {
    const res = id ? await updateActivity(id, values) : await createActivity(values);
    if (res.ok) {
      toast.success("تم الحفظ بنجاح");
      setOpen(false);
      if (!id) reset();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  const field = "space-y-1.5";
  const watchedKind = watch("kind");
  const watchedSupervisor = watch("supervisor_id");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? "تعديل النشاط" : "إضافة نشاط"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className={field}>
            <Label>اسم النشاط *</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>النوع</Label>
              <Select
                value={watchedKind ?? undefined}
                onValueChange={(v) =>
                  setValue("kind", v as ActivityInput["kind"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={field}>
              <Label>المشرف</Label>
              <Select
                value={watchedSupervisor ?? undefined}
                onValueChange={(v) => setValue("supervisor_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المشرف" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name ?? s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={field}>
              <Label>تاريخ البداية</Label>
              <Input type="date" {...register("start_date")} />
            </div>

            <div className={field}>
              <Label>تاريخ النهاية</Label>
              <Input type="date" {...register("end_date")} />
            </div>

            <div className={field}>
              <Label>الرسوم (د.ك)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                {...register("fee")}
              />
            </div>

            <div className={field}>
              <Label>الطاقة الاستيعابية</Label>
              <Input
                type="number"
                min={1}
                dir="ltr"
                {...register("capacity")}
              />
            </div>
          </div>

          <div className={field}>
            <Label>وصف النشاط</Label>
            <Input {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
