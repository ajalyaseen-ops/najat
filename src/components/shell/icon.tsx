import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  CalendarDays,
  BookMarked,
  BookHeart,
  Scale,
  Eye,
  Trophy,
  FileText,
  LineChart,
  MessageSquare,
  Wallet,
  ShieldCheck,
  Palette,
  Settings,
  ScrollText,
  type LucideProps,
} from "lucide-react";

const MAP = {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  CalendarDays,
  BookMarked,
  BookHeart,
  Scale,
  Eye,
  Trophy,
  FileText,
  LineChart,
  MessageSquare,
  Wallet,
  ShieldCheck,
  Palette,
  Settings,
  ScrollText,
} as const;

export type IconName = keyof typeof MAP;

/** Render a lucide icon by name (used by the data-driven sidebar). */
export function NavIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = MAP[name as IconName] ?? LayoutDashboard;
  return <Cmp {...props} />;
}
