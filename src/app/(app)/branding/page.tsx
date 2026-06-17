import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { BrandingForm } from "@/features/branding/branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "branding:write")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  // Fetch the current school row. schoolId may be null for super_admin accounts
  // without a bound school — fall back to a safe empty shape.
  const schoolId = profile.schoolId;

  let school: {
    name_ar: string;
    name_en: string | null;
    slogan_ar: string | null;
    logo_url: string | null;
    stamp_url: string | null;
    signature_url: string | null;
    theme: Record<string, string> | null;
  } | null = null;

  if (schoolId) {
    const { data } = await supabase
      .from("schools")
      .select("name_ar, name_en, slogan_ar, logo_url, stamp_url, signature_url, theme")
      .eq("id", schoolId)
      .single();
    school = (data as typeof school) ?? null;
  }

  // Fallback when no school is bound (super_admin without selected tenant).
  const resolved = school ?? {
    name_ar: "",
    name_en: null,
    slogan_ar: null,
    logo_url: null,
    stamp_url: null,
    signature_url: null,
    theme: null,
  };

  return (
    <div>
      <PageHeader
        title={t("branding")}
        subtitle="تخصيص اسم المدرسة وشعارها وألوان الواجهة"
      />

      {!schoolId && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          الحساب الحالي غير مرتبط بمدرسة. يُرجى تعيين مدرسة أولاً من إعدادات النظام.
        </div>
      )}

      <BrandingForm school={resolved} />
    </div>
  );
}
