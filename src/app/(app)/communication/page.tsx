import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AnnouncementsTable,
  type AnnouncementRow,
} from "@/features/communication/announcements-table";
import { ChannelsPanel } from "@/features/communication/channels-panel";

export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const profile = await requireSession();
  if (!hasPermission(profile.role, "communication:send")) redirect("/dashboard");

  const t = await getTranslations("nav");
  const supabase = await createClient();

  // Fetch announcements joined with creator profile name.
  const { data: announcements } = await supabase
    .from("announcements")
    .select(
      "id, title, body, audience, published_at, created_at, creator:created_by(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: AnnouncementRow[] = (announcements ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    body: a.body ?? null,
    audience: a.audience,
    published_at: a.published_at ?? null,
    created_at: a.created_at,
    creator_name: (a.creator as any)?.full_name ?? null,
  }));

  const canWrite = hasPermission(profile.role, "communication:send");

  return (
    <div>
      <PageHeader title={t("communication")} subtitle="إدارة الإعلانات وقنوات التواصل مع المجتمع المدرسي" />

      <Tabs defaultValue="announcements">
        <TabsList>
          <TabsTrigger value="announcements">الإعلانات</TabsTrigger>
          <TabsTrigger value="channels">قنوات التواصل</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <AnnouncementsTable rows={rows} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
