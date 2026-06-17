"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { memorizeSchema, type MemorizeInput } from "./schema";
import { createMemorizationRecord, updateMemorizationRecord } from "./actions";
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

export type SurahOption = { number: number; name_ar: string };
export type StudentOption = { id: string; name_ar: string };

export function MemorizationFormDialog({
  trigger,
  surahs,
  students,
  initial,
  id,
  defaultStudentId,
}: {
  trigger: React.ReactNode;
  surahs: SurahOption[];
  students: StudentOption[];
  initial?: Partial<MemorizeInput>;
  id?: string;
  defaultStudentId?: string;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemorizeInput>({
    resolver: zodResolver(memorizeSchema),
    defaultValues: {
      status: "in_progress",
      student_id: defaultStudentId ?? "",
      ...initial,
    },
  });

  async function onSubmit(values: MemorizeInput) {
    const res = id
      ? await updateMemorizationRecord(id, values)
      : await createMemorizationRecord(values);
    if (res.ok) {
      toast.success("تم الحفظ بنجاح");
      setOpen(false);
      if (!id) reset();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  const field = "space-y-1.5";
  const statusValue = watch("status");
  const studentValue = watch("student_id");
  const surahValue = watch("surah_number");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? "تعديل سجل الحفظ" : "إضافة سجل حفظ"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className={field}>
            <Label>الطالب *</Label>
            <Select
              value={studentValue || ""}
              onValueChange={(v) => setValue("student_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الطالب" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.student_id && (
              <p className="text-xs text-destructive">{errors.student_id.message}</p>
            )}
          </div>

          <div className={field}>
            <Label>السورة *</Label>
            <Select
              value={surahValue ? String(surahValue) : ""}
              onValueChange={(v) => setValue("surah_number", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر السورة" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {surahs.map((s) => (
                  <SelectItem key={s.number} value={String(s.number)}>
                    {s.number}. {s.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>من الآية</Label>
              <Input type="number" min={1} {...register("from_ayah")} />
            </div>
            <div className={field}>
              <Label>إلى الآية</Label>
              <Input type="number" min={1} {...register("to_ayah")} />
            </div>
          </div>

          <div className={field}>
            <Label>الحالة</Label>
            <Select
              value={statusValue}
              onValueChange={(v) =>
                setValue("status", v as "not_started" | "in_progress" | "memorized")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">لم يبدأ</SelectItem>
                <SelectItem value="in_progress">جارٍ الحفظ</SelectItem>
                <SelectItem value="memorized">محفوظ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>الدرجة (من 100)</Label>
              <Input type="number" min={0} max={100} step={0.5} {...register("score")} />
            </div>
            <div className={field}>
              <Label>درجة التجويد (من 100)</Label>
              <Input type="number" min={0} max={100} step={0.5} {...register("tajweed_score")} />
            </div>
          </div>

          <div className={field}>
            <Label>تاريخ التقييم</Label>
            <Input type="date" {...register("assessed_at")} />
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
