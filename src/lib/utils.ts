import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials for avatars (handles Arabic + Latin names). */
export function initials(name?: string | null): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("");
}

/** Clamp a percentage to [0, 100] and round. */
export function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
