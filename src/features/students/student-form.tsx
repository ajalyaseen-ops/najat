"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { studentSchema, type StudentInput } from "./schema";
import { createStudent, updateStudent } from "./actions";
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

type ClassOption = { id: string; name: string };

export function StudentFormDialog({
  trigger,
  classes,
  initial,
  id,
}: {
  trigger: React.ReactNode;
  classes: ClassOption[];
  initial?: Partial<StudentInput>;
  id?: string;
}) {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { status: "enrolled", gender: "male", ...initial },
  });

  async function onSubmit(values: StudentInput) {
    const res = id ? await updateStudent(id, values) : await createStudent(values);
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
          <DialogTitle>{id ? t("editStudent") : t("addStudent")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>{t("nameAr")} *</Label>
              <Input {...register("name_ar")} />
              {errors.name_ar && <p className="text-xs text-destructive">{errors.name_ar.message}</p>}
            </div>
            <div className={field}>
              <Label>{t("nameEn")}</Label>
              <Input dir="ltr" {...register("name_en")} />
            </div>
            <div className={field}>
              <Label>{t("gender")}</Label>
              <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as "male" | "female")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("male")}</SelectItem>
                  <SelectItem value="female">{t("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label>{t("dob")}</Label>
              <Input type="date" {...register("dob")} />
            </div>
            <div className={field}>
              <Label>{t("ministryNumber")}</Label>
              <Input dir="ltr" {...register("ministry_no")} />
            </div>
            <div className={field}>
              <Label>{t("civilId")}</Label>
              <Input dir="ltr" {...register("civil_id")} />
            </div>
            <div className={field}>
              <Label>{t("nationality")}</Label>
              <Input {...register("nationality")} />
            </div>
            <div className={field}>
              <Label>{t("class")}</Label>
              <Select
                value={watch("current_class_id") ?? undefined}
                onValueChange={(v) => setValue("current_class_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className={field}>
              <Label>{t("fatherName")}</Label>
              <Input {...register("father_name")} />
            </div>
            <div className={field}>
              <Label>{t("guardianName")}</Label>
              <Input {...register("guardian_name")} />
            </div>
            <div className={field}>
              <Label>{t("mobile")}</Label>
              <Input dir="ltr" {...register("guardian_mobile")} />
            </div>
            <div className={field}>
              <Label>{t("guardian")} — Email</Label>
              <Input dir="ltr" type="email" {...register("guardian_email")} />
            </div>
          </section>

          <div className={field}>
            <Label>{t("medicalNotes")}</Label>
            <Input {...register("medical_notes")} />
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
