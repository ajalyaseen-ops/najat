"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateSchoolCalendar } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarTab({
  current,
  canWrite,
}: {
  current: "gregorian" | "hijri";
  canWrite: boolean;
}) {
  const [value, setValue] = useState<"gregorian" | "hijri">(current);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const res = await updateSchoolCalendar({ calendar: value });
    setSaving(false);
    if (res.ok) toast.success("تم حفظ إعداد التقويم");
    else toast.error(res.error === "forbidden" ? "ليس لديك صلاحية" : res.error);
  }

  const optionClass = (v: "gregorian" | "hijri") =>
    [
      "flex items-center gap-3 rounded-xl border-2 px-5 py-4 cursor-pointer transition-colors",
      value === v
        ? "border-primary bg-primary/5 text-primary"
        : "border-border hover:border-muted-foreground/40",
      !canWrite ? "opacity-50 pointer-events-none" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">نوع التقويم المدرسي</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <label className={optionClass("gregorian")}>
            <input
              type="radio"
              name="calendar"
              value="gregorian"
              checked={value === "gregorian"}
              onChange={() => setValue("gregorian")}
              className="accent-primary"
              disabled={!canWrite}
            />
            <div>
              <p className="font-semibold">ميلادي</p>
              <p className="text-sm text-muted-foreground">Gregorian Calendar</p>
            </div>
          </label>
          <label className={optionClass("hijri")}>
            <input
              type="radio"
              name="calendar"
              value="hijri"
              checked={value === "hijri"}
              onChange={() => setValue("hijri")}
              className="accent-primary"
              disabled={!canWrite}
            />
            <div>
              <p className="font-semibold">هجري</p>
              <p className="text-sm text-muted-foreground">Hijri Calendar</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            حفظ
          </Button>
        </div>
      )}
    </div>
  );
}
