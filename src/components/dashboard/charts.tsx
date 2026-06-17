"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART = {
  c1: "hsl(218 64% 33%)",
  c2: "hsl(152 54% 42%)",
  c3: "hsl(38 92% 55%)",
  c4: "hsl(256 50% 55%)",
  c5: "hsl(199 75% 45%)",
};

export function AttendanceTrendChart({ data }: { data: { label: string; pct: number }[] }) {
  const t = useTranslations("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("attendanceTrend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ left: -20, right: 8 }}>
            <defs>
              <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART.c2} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART.c2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="pct" stroke={CHART.c2} strokeWidth={2} fill="url(#att)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DepartmentPerformanceChart({ data }: { data: { label: string; score: number }[] }) {
  const t = useTranslations("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("departmentPerformance")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} fill={CHART.c1} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function EnrollmentDonut({ data }: { data: { label: string; value: number }[] }) {
  const t = useTranslations("dashboard");
  const colors = [CHART.c1, CHART.c2, CHART.c3, CHART.c4, CHART.c5];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("enrollment")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
