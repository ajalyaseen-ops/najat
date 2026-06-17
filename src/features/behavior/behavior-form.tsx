"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { behaviorSchema, type BehaviorInput } from "./schema";
import { createBehaviorRecord, updateBehaviorRecord } from "./actions";
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

type StudentOption = { id: string; name_ar: string };

const POSITIVE_CATEGORIES = [
  "تفوق دراسي",
  "قيادة ومبادرة",
  "حسن سلوك",
  "مساعدة الآخرين",
  "إنجاز رياضي",
  "إنجاز فني",
  "حضور منتظم",
  "أخرى",
];

const NEGATIVE_CATEGORIES = [
  "غياب غير مبرر",
  "إخلال بالنظام",
  "سلوك عدواني",
  "الغش",
  "إتلاف ممتلكات",
  "تنمر",
  "عدم التزام بالزي",
  "أخرى",
];

export function BehaviorFormDialog({
  trigger,
  students,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  students: StudentOption[];
  initial?: Partial<BehaviorInput>;
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
  } = useForm<BehaviorInput>({
    resolver: zodResolver(behaviorSchema),
    defaultValues: {
      kind: "positive",
      date: new Date().toISOString().slice(0, 10),
      points: 0,
      ...initial,
    },
  });

  const kindValue = watch("kind");
  const categories = kindValue === "positive" ? POSITIVE_CATEGORIES : NEGATIVE_CATEGORIES;

  async function onSubmit(values: BehaviorInput) {
    const res = id
      ? await updateBehaviorRecord(id, values)
      : await createBehaviorRecord(values);
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? "تعديل سجل السلوك" : "إضافة سجل سلوك"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Student */}
            <div className={`${field} sm:col-span-2`}>
              <Label>الطالب *</Label>
              <Select
                value={watch("student_id") ?? undefined}
                onValueChange={(v) => setValue("student_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر طالباً" />
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

            {/* Kind */}
            <div className={field}>
              <Label>النوع *</Label>
              <Select
                value={kindValue}
                onValueChange={(v) => {
                  setValue("kind", v as "positive" | "negative");
                  setValue("category", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">إيجابي</SelectItem>
                  <SelectItem value="negative">سلبي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className={field}>
              <Label>الفئة *</Label>
              <Select
                value={watch("category") ?? undefined}
                onValueChange={(v) => setValue("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
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

            {/* Points */}
            <div className={field}>
              <Label>النقاط</Label>
              <Input type="number" {...register("points")} />
            </div>

            {/* Description */}
            <div className={`${field} sm:col-span-2`}>
              <Label>الوصف</Label>
              <Input {...register("description")} placeholder="وصف مختصر للحادثة أو السلوك" />
            </div>

            {/* Action Taken */}
            <div className={`${field} sm:col-span-2`}>
              <Label>الإجراء المتخذ</Label>
              <Input
                {...register("action_taken")}
                placeholder="مثال: تنبيه شفهي، إشعار ولي الأمر، إيقاف مؤقت…"
              />
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
