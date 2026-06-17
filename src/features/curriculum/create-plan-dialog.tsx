"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, BookPlus } from "lucide-react";
import { createPlanSchema, type CreatePlanInput } from "./schema";
import { createCurriculumPlan } from "./actions";
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

type SubjectOption = { id: string; name_ar: string };
type GradeOption = { id: string; name_ar: string };
type YearOption = { id: string; name: string };

export function CreatePlanDialog({
  subjects,
  gradeLevels,
  academicYears,
  trigger,
}: {
  subjects: SubjectOption[];
  gradeLevels: GradeOption[];
  academicYears: YearOption[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
  });

  async function onSubmit(values: CreatePlanInput) {
    const res = await createCurriculumPlan(values);
    if (res.ok) {
      toast.success("تم إنشاء الخطة بنجاح");
      setOpen(false);
      reset();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  const field = "space-y-1.5";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <BookPlus /> إنشاء خطة منهج
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إنشاء خطة منهج جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className={field}>
            <Label>عنوان الخطة *</Label>
            <Input {...register("title")} placeholder="مثال: منهج اللغة العربية — الفصل الأول" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className={field}>
            <Label>المادة *</Label>
            <Select
              value={watch("subject_id")}
              onValueChange={(v) => setValue("subject_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subject_id && (
              <p className="text-xs text-destructive">{errors.subject_id.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>المرحلة الدراسية</Label>
              <Select
                value={watch("grade_level_id") ?? undefined}
                onValueChange={(v) => setValue("grade_level_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختياري" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={field}>
              <Label>العام الدراسي</Label>
              <Select
                value={watch("academic_year_id") ?? undefined}
                onValueChange={(v) => setValue("academic_year_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختياري" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
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
