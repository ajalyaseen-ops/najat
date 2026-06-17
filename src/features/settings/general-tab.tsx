"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { schoolGeneralSchema, type SchoolGeneralInput } from "./schema";
import { updateSchoolGeneral } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SchoolRow = {
  name_ar: string;
  name_en: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  principal_name: string | null;
};

export function GeneralTab({ school, canWrite }: { school: SchoolRow | null; canWrite: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchoolGeneralInput>({
    resolver: zodResolver(schoolGeneralSchema),
    defaultValues: {
      name_ar: school?.name_ar ?? "",
      name_en: school?.name_en ?? "",
      address: school?.address ?? "",
      phone: school?.phone ?? "",
      email: school?.email ?? "",
      website: school?.website ?? "",
      principal_name: school?.principal_name ?? "",
    },
  });

  async function onSubmit(values: SchoolGeneralInput) {
    const res = await updateSchoolGeneral(values);
    if (res.ok) toast.success("تم الحفظ بنجاح");
    else toast.error(res.error === "forbidden" ? "ليس لديك صلاحية" : res.error);
  }

  const field = "space-y-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">بيانات المدرسة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className={field}>
            <Label>اسم المدرسة بالعربية *</Label>
            <Input {...register("name_ar")} disabled={!canWrite} />
            {errors.name_ar && (
              <p className="text-xs text-destructive">{errors.name_ar.message}</p>
            )}
          </div>
          <div className={field}>
            <Label>اسم المدرسة بالإنجليزية</Label>
            <Input dir="ltr" {...register("name_en")} disabled={!canWrite} />
          </div>
          <div className={field}>
            <Label>اسم المدير</Label>
            <Input {...register("principal_name")} disabled={!canWrite} />
          </div>
          <div className={field}>
            <Label>رقم الهاتف</Label>
            <Input dir="ltr" {...register("phone")} disabled={!canWrite} />
          </div>
          <div className={field}>
            <Label>البريد الإلكتروني</Label>
            <Input dir="ltr" type="email" {...register("email")} disabled={!canWrite} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className={field}>
            <Label>الموقع الإلكتروني</Label>
            <Input dir="ltr" {...register("website")} disabled={!canWrite} />
          </div>
          <div className={`${field} sm:col-span-2`}>
            <Label>العنوان</Label>
            <Input {...register("address")} disabled={!canWrite} />
          </div>
        </CardContent>
      </Card>

      {canWrite && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            حفظ الإعدادات
          </Button>
        </div>
      )}
    </form>
  );
}
