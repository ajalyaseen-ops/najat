"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { NavIcon } from "@/components/shell/icon";

export type ReportEntry = {
  id: string;
  titleAr: string;
  descriptionAr: string;
  icon: string;
  /** href to navigate to when the report is ready; undefined = coming soon */
  href?: string;
  /** category label */
  categoryAr: string;
};

export const REPORT_CATALOG: ReportEntry[] = [
  {
    id: "student-report-card",
    titleAr: "كشف درجات الطالب",
    descriptionAr: "تقرير شامل بدرجات الطالب في جميع المواد الدراسية لكل فصل.",
    icon: "GraduationCap",
    categoryAr: "أكاديمي",
  },
  {
    id: "attendance-report",
    titleAr: "تقرير الحضور والغياب",
    descriptionAr: "نسب حضور الطلاب والمعلمين حسب الفصل والمادة والفترة الزمنية.",
    icon: "CalendarCheck",
    categoryAr: "يومي",
  },
  {
    id: "behavior-report",
    titleAr: "تقرير السلوك والانضباط",
    descriptionAr: "ملخص المخالفات السلوكية والمكافآت ومقارنة الشهور.",
    icon: "Scale",
    categoryAr: "انضباط",
  },
  {
    id: "curriculum-coverage",
    titleAr: "تغطية المنهج الدراسي",
    descriptionAr: "نسبة إنجاز كل وحدة دراسية لكل مادة ومعلم حتى اليوم.",
    icon: "BookOpen",
    categoryAr: "أكاديمي",
  },
  {
    id: "top-students",
    titleAr: "الطلاب المتميزون",
    descriptionAr: "قائمة أعلى الطلاب في الدرجات مرتبةً حسب الفصل والمرحلة.",
    icon: "Trophy",
    categoryAr: "أكاديمي",
  },
  {
    id: "at-risk-students",
    titleAr: "الطلاب في دائرة الخطر",
    descriptionAr: "رصد الطلاب ذوي الغيابات المتكررة أو الدرجات المنخفضة للتدخل المبكر.",
    icon: "Eye",
    categoryAr: "تدخل مبكر",
  },
  {
    id: "department-kpis",
    titleAr: "مؤشرات الأداء الإدارية",
    descriptionAr: "KPIs على مستوى الأقسام: المعلمون والفصول والإنجاز ومعدلات النجاح.",
    icon: "LineChart",
    categoryAr: "إدارة",
  },
  {
    id: "quran-certificate",
    titleAr: "شهادة ختم القرآن الكريم",
    descriptionAr: "طباعة شهادة إتمام حفظ القرآن الكريم للطالب مع بيانات المدرسة.",
    icon: "BookHeart",
    categoryAr: "إسلامية",
  },
];

export type ReportStats = {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceToday: number;
  attendanceTodayTotal: number;
};

function CategoryBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    "أكاديمي": "bg-blue-500/10 text-blue-600",
    "يومي": "bg-green-500/10 text-green-600",
    "انضباط": "bg-orange-500/10 text-orange-700",
    "تدخل مبكر": "bg-red-500/10 text-red-600",
    "إدارة": "bg-purple-500/10 text-purple-700",
    "إسلامية": "bg-emerald-500/10 text-emerald-700",
  };
  const cls = colorMap[label] ?? "bg-secondary text-secondary-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatsStrip({ stats }: { stats: ReportStats }) {
  const pct =
    stats.attendanceTodayTotal > 0
      ? Math.round((stats.attendanceToday / stats.attendanceTodayTotal) * 100)
      : 0;

  const items = [
    { labelAr: "الطلاب", value: stats.totalStudents, icon: "GraduationCap" },
    { labelAr: "المعلمون", value: stats.totalTeachers, icon: "Users" },
    { labelAr: "الفصول", value: stats.totalClasses, icon: "School" },
    { labelAr: "حضور اليوم", value: `${pct}%`, icon: "CalendarCheck" },
  ] as const;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.labelAr}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <NavIcon name={item.icon} size={20} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.labelAr}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportCatalog({ stats }: { stats: ReportStats }) {
  return (
    <div>
      <StatsStrip stats={stats} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORT_CATALOG.map((report) => (
          <Card
            key={report.id}
            className="group flex flex-col transition-shadow hover:shadow-md"
          >
            <CardHeader className="pb-3">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <NavIcon name={report.icon} size={22} />
                </div>
                <CategoryBadge label={report.categoryAr} />
              </div>
              <CardTitle className="text-base">{report.titleAr}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {report.descriptionAr}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1" />

            <CardFooter className="pt-0">
              {report.href ? (
                <Button asChild size="sm" className="w-full">
                  <Link href={report.href}>عرض التقرير</Link>
                </Button>
              ) : (
                <div className="flex w-full items-center gap-2">
                  <Button size="sm" variant="outline" disabled className="flex-1">
                    عرض التقرير
                  </Button>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    قريبًا
                  </Badge>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
