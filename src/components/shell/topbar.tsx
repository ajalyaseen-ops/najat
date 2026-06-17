"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, GraduationCap, Search } from "lucide-react";
import { NAVIGATION } from "@/lib/navigation";
import { hasPermission, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { NavIcon } from "./icon";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Topbar({
  role,
  name,
  email,
  avatarUrl,
  schoolName,
}: {
  role: Role;
  name: string;
  email: string;
  avatarUrl: string | null;
  schoolName: string;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="safe-top sticky top-0 z-30 flex min-h-[4rem] items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Mobile nav trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="safe-top start-0 top-0 h-screen max-w-[280px] translate-x-0 translate-y-0 overflow-y-auto rounded-none rtl:translate-x-0 bg-sidebar text-sidebar-foreground">
          <DialogTitle className="flex items-center gap-2 text-white">
            <GraduationCap className="h-5 w-5" /> {schoolName}
          </DialogTitle>
          <nav className="-mx-2 mt-2 space-y-1 overflow-y-auto">
            {NAVIGATION.flatMap((g) => g.items)
              .filter((i) => !i.permission || hasPermission(role, i.permission))
              .map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                      active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80"
                    )}
                  >
                    <NavIcon name={item.icon} className="h-5 w-5" />
                    {t(item.key)}
                  </Link>
                );
              })}
          </nav>
        </DialogContent>
      </Dialog>

      {/* Global search (NL search hook lives here in the AI module) */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-lg border border-input bg-muted/40 ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("groups.insights")}
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        <LanguageSwitcher />
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu name={name} email={email} role={role} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
