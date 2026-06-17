import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { UsersTable, type UserRow } from "@/features/users/users-table";
import { PermissionsPanel } from "@/features/users/permissions-panel";
import type { Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "users:manage")) redirect("/dashboard");

  const t = await getTranslations("nav");

  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");

  const rows: UserRow[] = (profiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role as Role,
  }));

  const canWrite = hasPermission(profile.role, "users:manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users")}
        subtitle="إدارة حسابات المستخدمين وأدوارهم في المدرسة"
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <strong>ملاحظة:</strong> إنشاء حسابات تسجيل الدخول الجديدة يتم عبر Supabase Auth أو دالة المسؤول (admin edge function). هنا يمكنك فقط تغيير الأدوار والصلاحيات.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <UsersTable
            rows={rows}
            canWrite={canWrite}
            currentUserId={profile.id}
          />
        </div>

        <div>
          <PermissionsPanel />
        </div>
      </div>
    </div>
  );
}
