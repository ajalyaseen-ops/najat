import { Card, CardContent } from "@/components/ui/card";
import { NavIcon } from "@/components/shell/icon";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", tones[tone])}>
          <NavIcon name={icon} className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
