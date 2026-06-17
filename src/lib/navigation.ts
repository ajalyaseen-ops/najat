import type { Permission } from "./rbac";

/**
 * Sidebar navigation map. Each item names a translation key under `nav.*`,
 * an icon (lucide-react name), its route, and the permission required to see
 * it. The sidebar filters items by the signed-in user's permissions.
 */
export type NavItem = {
  key: string; // i18n key under nav.*
  href: string;
  icon: string; // lucide-react icon name
  permission?: Permission;
};

export type NavGroup = {
  key: string; // i18n key under nav.groups.*
  items: NavItem[];
};

export const NAVIGATION: NavGroup[] = [
  {
    key: "academic",
    items: [
      { key: "dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { key: "students", href: "/students", icon: "GraduationCap", permission: "students:read" },
      { key: "teachers", href: "/teachers", icon: "Users", permission: "teachers:read" },
      { key: "classes", href: "/classes", icon: "School", permission: "classes:read" },
      { key: "subjects", href: "/subjects", icon: "BookOpen", permission: "subjects:read" },
      { key: "departments", href: "/departments", icon: "Building2", permission: "departments:read" },
    ],
  },
  {
    key: "operations",
    items: [
      { key: "attendance", href: "/attendance", icon: "CalendarCheck", permission: "attendance:read" },
      { key: "grades", href: "/grades", icon: "ClipboardList", permission: "grades:read" },
      { key: "timetable", href: "/timetable", icon: "CalendarDays", permission: "timetable:read" },
      { key: "curriculum", href: "/curriculum", icon: "BookMarked", permission: "curriculum:read" },
      { key: "islamic", href: "/islamic", icon: "BookHeart", permission: "islamic:read" },
      { key: "behavior", href: "/behavior", icon: "Scale", permission: "behavior:read" },
      { key: "observations", href: "/observations", icon: "Eye", permission: "observations:read" },
      { key: "activities", href: "/activities", icon: "Trophy", permission: "activities:read" },
    ],
  },
  {
    key: "insights",
    items: [
      { key: "reports", href: "/reports", icon: "FileText", permission: "reports:read" },
      { key: "analytics", href: "/analytics", icon: "LineChart", permission: "analytics:read" },
      { key: "communication", href: "/communication", icon: "MessageSquare", permission: "communication:send" },
    ],
  },
  {
    key: "administration",
    items: [
      { key: "finance", href: "/finance", icon: "Wallet", permission: "finance:read" },
      { key: "users", href: "/users", icon: "ShieldCheck", permission: "users:manage" },
      { key: "branding", href: "/branding", icon: "Palette", permission: "branding:write" },
      { key: "settings", href: "/settings", icon: "Settings", permission: "settings:write" },
      { key: "auditLog", href: "/audit", icon: "ScrollText", permission: "audit:read" },
    ],
  },
];
