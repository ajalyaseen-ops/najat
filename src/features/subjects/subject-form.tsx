"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { subjectSchema, type SubjectInput } from "./schema";
import { createSubject, updateSubject } from "./actions";
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

type DepartmentOption = { id: string; name: string };

export function SubjectFormDialog({
  trigger,
  departments,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  departments: DepartmentOption[];
  initial?: Partial<SubjectInput>;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { weekly_periods: 1, ...initial },
  });

  async function onSubmit(values: SubjectInput) {
    const res = id ? await updateSubject(id, values) : await createSubject(values);
    if (res.ok) {
      toast.success("تم الحفظ بنجاح");
      setOpen(false);
      if (!id) reset();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  const field = "space-y-1.5";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? "تعديل مادة" : "إضافة مادة دراسية"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>اسم المادة (عربي) *</Label>
              <Input {...register("name_ar")} />
              {errors.name_ar && (
                <p className="text-xs text-destructive">{errors.name_ar.message}</p>
              )}
            </div>
            <div className={field}>
              <Label>اسم المادة (إنجليزي)</Label>
              <Input dir="ltr" {...register("name_en")} />
            </div>
            <div className={field}>
              <Label>رمز المادة *</Label>
              <Input dir="ltr" {...register("code")} placeholder="e.g. MATH101" />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>
            <div className={field}>
              <Label>عدد الحصص الأسبوعية *</Label>
              <Input
                type="number"
                min={1}
                dir="ltr"
                {...register("weekly_periods", { valueAsNumber: true })}
              />
              {errors.weekly_periods && (
                <p className="text-xs text-destructive">{errors.weekly_periods.message}</p>
              )}
            </div>
            <div className={`${field} sm:col-span-2`}>
              <Label>القسم</Label>
              <Select
                value={watch("department_id") ?? undefined}
                onValueChange={(v) => setValue("department_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— بدون قسم —" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
