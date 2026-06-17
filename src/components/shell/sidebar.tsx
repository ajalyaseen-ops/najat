"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { GraduationCap, ChevronsLeftRight, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVIGATION } from "@/lib/navigation";
import { hasPermission, type Role } from "@/lib/rbac";
import { NavIcon } from "./icon";

export function Sidebar({
  role,
  schoolName,
  logoUrl,
}: {
  role: Role;
  schoolName: string;
  logoUrl: string | null;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "no-scrollbar sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <GraduationCap className="h-6 w-6" />
          )}
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-bold leading-tight">{schoolName}</span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-6 px-3 py-4">
        {NAVIGATION.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || hasPermission(role, item.permission)
          );
          if (items.length === 0) return null;
          return (
            <div key={group.key}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {t(`groups.${group.key}`)}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? t(item.key) : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
                          collapsed && "justify-center"
                        )}
                      >
                        <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="truncate">{t(item.key)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-xs text-sidebar-foreground/60 hover:text-white"
      >
        {collapsed ? <ChevronsLeftRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  );
}
