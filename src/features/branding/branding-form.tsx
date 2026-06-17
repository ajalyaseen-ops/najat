"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ImageIcon } from "lucide-react";
import { brandingSchema, type BrandingInput } from "./schema";
import { saveBranding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type SchoolBranding = {
  name_ar: string;
  name_en: string | null;
  slogan_ar: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  theme: Record<string, string> | null;
};

export function BrandingForm({ school }: { school: SchoolBranding }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BrandingInput>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      name_ar: school.name_ar ?? "",
      name_en: school.name_en ?? "",
      slogan_ar: school.slogan_ar ?? "",
      logo_url: school.logo_url ?? "",
      stamp_url: school.stamp_url ?? "",
      signature_url: school.signature_url ?? "",
      theme_primary: school.theme?.["--primary"] ?? "",
      theme_secondary: school.theme?.["--secondary"] ?? "",
    },
  });

  const primaryHsl = watch("theme_primary") ?? "";
  const logoUrl = watch("logo_url") ?? "";

  // Derive CSS color string for live swatch preview.
  const swatchStyle = primaryHsl.trim()
    ? { background: `hsl(${primaryHsl})` }
    : { background: "transparent" };

  async function onSubmit(values: BrandingInput) {
    const res = await saveBranding(values);
    if (res.ok) {
      toast.success("تم حفظ هوية المدرسة بنجاح");
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح لك" : res.error);
    }
  }

  const field = "space-y-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Section 1: Names ── */}
      <Card className="rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">اسم المدرسة</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={field}>
            <Label>الاسم بالعربي <span className="text-destructive">*</span></Label>
            <Input {...register("name_ar")} placeholder="مدرسة الأمل" />
            {errors.name_ar && (
              <p className="text-xs text-destructive">{errors.name_ar.message}</p>
            )}
          </div>
          <div className={field}>
            <Label>الاسم بالإنجليزي</Label>
            <Input dir="ltr" {...register("name_en")} placeholder="Al-Amal School" />
          </div>
          <div className={`${field} sm:col-span-2`}>
            <Label>الشعار / الرسالة</Label>
            <Input {...register("slogan_ar")} placeholder="نحو مستقبل مشرق" />
          </div>
        </div>
      </Card>

      {/* ── Section 2: Assets (URL fields) ── */}
      <Card className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">الصور والأختام</h2>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700 border border-amber-200">
            TODO: رفع ملف — أدخل الرابط مؤقتاً
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Logo */}
          <div className={field}>
            <Label>رابط الشعار</Label>
            <Input dir="ltr" {...register("logo_url")} placeholder="https://…/logo.png" />
            {errors.logo_url && (
              <p className="text-xs text-destructive">{errors.logo_url.message}</p>
            )}
          </div>

          {/* Logo preview */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="شعار"
                className="h-16 w-16 rounded-lg border object-contain bg-muted"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              معاينة الشعار.
              <br />
              يُرفع الملف عبر Supabase Storage
              <br />
              (قريباً).
            </p>
          </div>

          {/* Stamp */}
          <div className={field}>
            <Label>رابط ختم المدرسة</Label>
            <Input dir="ltr" {...register("stamp_url")} placeholder="https://…/stamp.png" />
            {errors.stamp_url && (
              <p className="text-xs text-destructive">{errors.stamp_url.message}</p>
            )}
          </div>

          {/* Signature */}
          <div className={field}>
            <Label>رابط توقيع المدير</Label>
            <Input dir="ltr" {...register("signature_url")} placeholder="https://…/sig.png" />
            {errors.signature_url && (
              <p className="text-xs text-destructive">{errors.signature_url.message}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          الصور تُستخدم في رأس التقارير المطبوعة وصفحة تسجيل الدخول.
          الأبعاد المثلى: شعار 200×200 بكسل, ختم/توقيع 150×150 بكسل (PNG شفاف).
        </div>
      </Card>

      {/* ── Section 3: Theme colors ── */}
      <Card className="rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">ألوان الواجهة</h2>
        <p className="text-xs text-muted-foreground">
          أدخل القيم بصيغة HSL بدون `hsl()` — مثال: <span dir="ltr">218 64% 23%</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Primary */}
          <div className={field}>
            <Label>اللون الأساسي (--primary)</Label>
            <div className="flex gap-2 items-center">
              <Input
                dir="ltr"
                {...register("theme_primary")}
                placeholder="218 64% 23%"
                className="font-mono"
              />
              {/* Live swatch */}
              <div
                className="h-9 w-9 shrink-0 rounded-md border shadow-inner transition-colors"
                style={swatchStyle}
                title={primaryHsl || "لم يُحدَّد بعد"}
              />
            </div>
            {errors.theme_primary && (
              <p className="text-xs text-destructive">{errors.theme_primary.message}</p>
            )}
          </div>

          {/* Secondary */}
          <div className={field}>
            <Label>اللون الثانوي (--secondary)</Label>
            <div className="flex gap-2 items-center">
              <Input
                dir="ltr"
                {...register("theme_secondary")}
                placeholder="210 40% 96%"
                className="font-mono"
              />
              <div
                className="h-9 w-9 shrink-0 rounded-md border shadow-inner transition-colors"
                style={
                  (watch("theme_secondary") ?? "").trim()
                    ? { background: `hsl(${watch("theme_secondary")})` }
                    : { background: "transparent" }
                }
              />
            </div>
            {errors.theme_secondary && (
              <p className="text-xs text-destructive">{errors.theme_secondary.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Submit ── */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty} size="lg">
          {isSubmitting && <Loader2 className="animate-spin me-2 h-4 w-4" />}
          حفظ الهوية
        </Button>
      </div>
    </form>
  );
}
