"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { feeStructureSchema, type FeeStructureInput } from "./schema";
import { createFeeStructure, updateFeeStructure } from "./actions";
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

type GradeOption = { id: string; name: string };
type YearOption = { id: string; name: string };

export function FeeStructureFormDialog({
  trigger,
  gradeLevels,
  academicYears,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  gradeLevels: GradeOption[];
  academicYears: YearOption[];
  initial?: Partial<FeeStructureInput>;
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
  } = useForm<FeeStructureInput>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: { amount: 0, ...initial },
  });

  async function onSubmit(values: FeeStructureInput) {
    const res = id
      ? await updateFeeStructure(id, values)
      : await createFeeStructure(values);
    if (res.ok) {
      toast.success("تم الحفظ بنجاح");
      setOpen(false);
      if (!id) reset();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  const field = "space-y-1.5";
  const NONE_VALUE = "__none__";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{id ? "تعديل هيكل رسوم" : "إضافة هيكل رسوم"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className={field}>
            <Label>اسم هيكل الرسوم *</Label>
            <Input {...register("name")} placeholder="مثال: رسوم الفصل الدراسي الأول" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className={field}>
            <Label>المبلغ (د.ك)</Label>
            <Input
              type="number"
              step="0.001"
              dir="ltr"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className={field}>
            <Label>المرحلة الدراسية</Label>
            <Select
              value={watch("grade_level_id") ?? NONE_VALUE}
              onValueChange={(v) =>
                setValue("grade_level_id", v === NONE_VALUE ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع المراحل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>جميع المراحل</SelectItem>
                {gradeLevels.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={field}>
            <Label>العام الدراسي</Label>
            <Select
              value={watch("academic_year_id") ?? NONE_VALUE}
              onValueChange={(v) =>
                setValue("academic_year_id", v === NONE_VALUE ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>—</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
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
              {isSubmitting && <Loader2 className="animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
