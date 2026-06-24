"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DeptOption = { id: string; name: string };

export function DepartmentSwitcher({
  departments,
  selectedId,
  label,
}: {
  departments: DeptOption[];
  selectedId: string | null;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dept", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (departments.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <Select value={selectedId ?? ""} onValueChange={onChange}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
