import { requireSession } from "@/lib/auth";
import { getActiveSchool } from "@/lib/school";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { getLocale } from "next-intl/server";

/**
 * Authenticated application shell. Enforces a session, loads the active
 * school's branding, and renders the sidebar + topbar around every page.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();
  const school = await getActiveSchool(profile.schoolId);
  const locale = (await getLocale()) as "ar" | "en";
  const schoolName = locale === "en" && school.nameEn ? school.nameEn : school.nameAr;

  // Per-school theme override (set by the Branding module). Cascades to :root.
  const themeCss = school.theme
    ? `:root{${Object.entries(school.theme)
        .map(([k, v]) => `${k}:${v}`)
        .join(";")}}`
    : null;

  return (
    <div className="flex min-h-screen">
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      <Sidebar role={profile.role} schoolName={schoolName} logoUrl={school.logoUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          role={profile.role}
          name={profile.fullName ?? profile.email ?? ""}
          email={profile.email ?? ""}
          avatarUrl={profile.avatarUrl}
          schoolName={schoolName}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
