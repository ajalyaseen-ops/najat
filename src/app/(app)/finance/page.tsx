import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  FinancePanel,
  type FeeStructureRow,
  type InvoiceRow,
} from "@/features/finance/finance-panel";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "finance:read")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  const [
    { data: feeStructures },
    { data: invoices },
    { data: gradeLevels },
    { data: academicYears },
  ] = await Promise.all([
    supabase
      .from("fee_structures")
      .select(
        "id, name, amount, grade_level_id, academic_year_id, created_at, grade_levels:grade_level_id(name), academic_years:academic_year_id(name)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("invoices")
      .select(
        "id, number, total, discount, status, due_date, created_at, students:student_id(name_ar), academic_years:academic_year_id(name)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("grade_levels").select("id, name").order("sort_order"),
    supabase
      .from("academic_years")
      .select("id, name")
      .order("start_date", { ascending: false }),
  ]);

  const fees = (feeStructures ?? []) as unknown as FeeStructureRow[];
  const invs = (invoices ?? []) as unknown as InvoiceRow[];

  return (
    <div>
      <PageHeader title={t("finance")} subtitle="إدارة الرسوم والفواتير المدرسية" />

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">وحدة مالية — جاهزة للتفعيل</p>
          <p className="mt-0.5 text-blue-700 dark:text-blue-400">
            البنية التحتية المالية مُجهَّزة بالكامل (هياكل رسوم، فواتير، أقساط، مدفوعات).
            يمكن إضافة هياكل الرسوم الآن. لتفعيل إصدار الفواتير وتسجيل المدفوعات تواصل مع
            فريق الدعم لإطلاق الميزة بالكامل.
          </p>
        </div>
      </div>

      <FinancePanel
        feeStructures={fees}
        invoices={invs}
        gradeLevels={(gradeLevels ?? []) as { id: string; name: string }[]}
        academicYears={(academicYears ?? []) as { id: string; name: string }[]}
        canWrite={hasPermission(profile.role, "finance:write")}
      />
    </div>
  );
}
