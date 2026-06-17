"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassOption = { id: string; name: string };

export function ClassSwitcher({
  classes,
  selectedClassId,
}: {
  classes: ClassOption[];
  selectedClassId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(classId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("class", classId);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (classes.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">الفصل:</span>
      <Select value={selectedClassId ?? ""} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="اختر الفصل" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
