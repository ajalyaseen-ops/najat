"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { classSchema, type ClassInput } from "./schema";
import { createClass, updateClass } from "./actions";
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

type GradeLevelOption = { id: string; name_ar: string };
type AcademicYearOption = { id: string; name: string };
type StaffOption = { id: string; name_ar: string };

export function ClassFormDialog({
  trigger,
  gradeLevels,
  academicYears,
  staff,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  gradeLevels: GradeLevelOption[];
  academicYears: AcademicYearOption[];
  staff: StaffOption[];
  initial?: Partial<ClassInput>;
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
  } = useForm<ClassInput>({
    resolver: zodResolver(classSchema),
    defaultValues: { status: "active", capacity: 42, ...initial },
  });

  async function onSubmit(values: ClassInput) {
    const res = id ? await updateClass(id, values) : await createClass(values);
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
          <DialogTitle>{id ? "تعديل الفصل" : "إضافة فصل جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Class name */}
            <div className={`${field} sm:col-span-2`}>
              <Label>اسم الفصل *</Label>
              <Input {...register("name")} placeholder="مثال: 1-أ" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Grade level */}
            <div className={field}>
              <Label>الصف الدراسي *</Label>
              <Select
                value={watch("grade_level_id") ?? undefined}
                onValueChange={(v) => setValue("grade_level_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade_level_id && (
                <p className="text-xs text-destructive">{errors.grade_level_id.message}</p>
              )}
            </div>

            {/* Academic year */}
            <div className={field}>
              <Label>السنة الدراسية *</Label>
              <Select
                value={watch("academic_year_id") ?? undefined}
                onValueChange={(v) => setValue("academic_year_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.academic_year_id && (
                <p className="text-xs text-destructive">{errors.academic_year_id.message}</p>
              )}
            </div>

            {/* Capacity */}
            <div className={field}>
              <Label>السعة (أقصى عدد طلاب)</Label>
              <Input
                type="number"
                min={1}
                dir="ltr"
                className="text-start"
                {...register("capacity")}
              />
              {errors.capacity && (
                <p className="text-xs text-destructive">{errors.capacity.message}</p>
              )}
            </div>

            {/* Class teacher */}
            <div className={field}>
              <Label>رائد الفصل</Label>
              <Select
                value={watch("class_teacher_id") ?? undefined}
                onValueChange={(v) => setValue("class_teacher_id", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— اختياري —" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (edit only) */}
            {id && (
              <div className={field}>
                <Label>الحالة</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as "active" | "archived")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
