"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GeneralTab } from "./general-tab";
import { AcademicTab, type AcademicYearRow } from "./academic-tab";
import { CalendarTab } from "./calendar-tab";

type SchoolRow = {
  name_ar: string;
  name_en: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  principal_name: string | null;
  calendar: "gregorian" | "hijri";
};

export function SettingsShell({
  school,
  academicYears,
  canWrite,
}: {
  school: SchoolRow | null;
  academicYears: AcademicYearRow[];
  canWrite: boolean;
}) {
  return (
    <Tabs defaultValue="general" dir="rtl">
      <TabsList className="mb-6 h-auto flex-wrap gap-1">
        <TabsTrigger value="general">عام</TabsTrigger>
        <TabsTrigger value="academic">الأعوام الدراسية</TabsTrigger>
        <TabsTrigger value="calendar">التقويم</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralTab school={school} canWrite={canWrite} />
      </TabsContent>

      <TabsContent value="academic">
        <AcademicTab years={academicYears} canWrite={canWrite} />
      </TabsContent>

      <TabsContent value="calendar">
        <CalendarTab
          current={(school?.calendar as "gregorian" | "hijri") ?? "gregorian"}
          canWrite={canWrite}
        />
      </TabsContent>
    </Tabs>
  );
}
