"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { departmentSchema, type DepartmentInput } from "./schema";
import { createDepartment, updateDepartment } from "./actions";
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

type StaffOption = { id: string; name: string };

export function DepartmentFormDialog({
  trigger,
  staff,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  staff: StaffOption[];
  initial?: Partial<DepartmentInput>;
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
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name_ar: "", name_en: "", head_id: null, ...initial },
  });

  async function onSubmit(values: DepartmentInput) {
    const res = id ? await updateDepartment(id, values) : await createDepartment(values);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{id ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>اسم القسم بالعربية *</Label>
              <Input {...register("name_ar")} placeholder="مثال: قسم الرياضيات" />
              {errors.name_ar && (
                <p className="text-xs text-destructive">{errors.name_ar.message}</p>
              )}
            </div>
            <div className={field}>
              <Label>اسم القسم بالإنجليزية</Label>
              <Input dir="ltr" {...register("name_en")} placeholder="e.g. Mathematics Dept." />
            </div>
          </div>

          <div className={field}>
            <Label>رئيس القسم</Label>
            <Select
              value={watch("head_id") ?? "none"}
              onValueChange={(v) => setValue("head_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر رئيس القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— بدون رئيس —</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
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
