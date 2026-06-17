"use client";

import { useRouter, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassOption = { id: string; name: string };

export function ClassDatePicker({
  classes,
  selectedClassId,
  selectedDate,
}: {
  classes: ClassOption[];
  selectedClassId: string;
  selectedDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(classId: string, date: string) {
    const params = new URLSearchParams({ class: classId, date });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Class selector */}
      <Select
        value={selectedClassId}
        onValueChange={(v) => navigate(v, selectedDate)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="اختر الفصل…" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date picker */}
      <div className="relative flex items-center">
        <CalendarDays className="pointer-events-none absolute start-3 h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            if (e.target.value) navigate(selectedClassId, e.target.value);
          }}
          className="h-10 rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
