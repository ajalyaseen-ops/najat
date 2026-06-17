"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { teacherSchema, type TeacherInput } from "./schema";
import { createTeacher, updateTeacher } from "./actions";
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

type DeptOption = { id: string; name_ar: string; name_en: string | null };

export function TeacherFormDialog({
  trigger,
  departments,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  departments: DeptOption[];
  initial?: Partial<TeacherInput>;
  id?: string;
}) {
  const t = useTranslations("teachers");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { status: "active", ...initial },
  });

  async function onSubmit(values: TeacherInput) {
    const res = id ? await updateTeacher(id, values) : await createTeacher(values);
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
          <DialogTitle>{id ? "تعديل بيانات المعلم" : t("addTeacher")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Basic identity */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>الاسم بالعربية *</Label>
              <Input {...register("name_ar")} />
              {errors.name_ar && (
                <p className="text-xs text-destructive">{errors.name_ar.message}</p>
              )}
            </div>
            <div className={field}>
              <Label>الاسم بالإنجليزية</Label>
              <Input dir="ltr" {...register("name_en")} />
            </div>
            <div className={field}>
              <Label>{t("employeeId")}</Label>
              <Input dir="ltr" {...register("employee_no")} />
            </div>
            <div className={field}>
              <Label>{t("hireDate")}</Label>
              <Input type="date" {...register("hire_date")} />
            </div>
          </section>

          {/* Role & department */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>{t("position")}</Label>
              <Input {...register("position")} />
            </div>
            <div className={field}>
              <Label>{t("department")}</Label>
              <Select
                value={watch("department_id") ?? undefined}
                onValueChange={(v) => setValue("department_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label>{t("qualifications")}</Label>
              <Input {...register("qualifications")} />
            </div>
            <div className={field}>
              <Label>{t("experience")} (سنوات)</Label>
              <Input
                dir="ltr"
                type="number"
                min={0}
                {...register("experience_years", { valueAsNumber: true })}
              />
              {errors.experience_years && (
                <p className="text-xs text-destructive">{errors.experience_years.message}</p>
              )}
            </div>
          </section>

          {/* Contact */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>البريد الإلكتروني</Label>
              <Input dir="ltr" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className={field}>
              <Label>رقم الجوال</Label>
              <Input dir="ltr" {...register("mobile")} />
            </div>
          </section>

          {/* Status */}
          <div className={field}>
            <Label>{tc("status")}</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as TeacherInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{tc("active")}</SelectItem>
                <SelectItem value="inactive">{tc("inactive")}</SelectItem>
                <SelectItem value="archived">{tc("archived")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
