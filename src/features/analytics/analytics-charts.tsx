"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AttendanceTrendChart,
  DepartmentPerformanceChart,
  EnrollmentDonut,
} from "@/components/dashboard/charts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---- Attendance Status breakdown bar chart (present/absent/excused/late) ----
const STATUS_COLORS: Record<string, string> = {
  present: "hsl(152 54% 42%)",
  absent: "hsl(0 72% 51%)",
  excused: "hsl(38 92% 55%)",
  late: "hsl(256 50% 55%)",
  medical: "hsl(199 75% 45%)",
};

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  excused: "بعذر",
  late: "متأخر",
  medical: "إجازة طبية",
};

export function AttendanceStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const labelled = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
    fill: STATUS_COLORS[d.status] ?? "hsl(218 64% 33%)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">توزيع الحضور هذا الشهر</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={labelled} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [v, "عدد"]} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {labelled.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---- Re-export shared charts for convenient use in the analytics page ----
export { AttendanceTrendChart, DepartmentPerformanceChart, EnrollmentDonut };
