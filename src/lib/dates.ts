import type { Locale } from "@/i18n/config";

export type CalendarSystem = "gregorian" | "hijri";

/**
 * Format a date in either the Gregorian or Hijri (Umm al-Qura) calendar,
 * localized to the active UI language. Uses the platform Intl engine, so no
 * extra dependency is needed.
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  calendar: CalendarSystem = "gregorian",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const base = locale === "ar" ? "ar-SA" : "en-US";
  const tag = calendar === "hijri" ? `${base}-u-ca-islamic-umalqura` : base;
  return new Intl.DateTimeFormat(tag, options).format(d);
}

/** Short numeric date (e.g. for tables). */
export function formatDateShort(date: Date | string, locale: Locale, calendar: CalendarSystem = "gregorian") {
  return formatDate(date, locale, calendar, { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Today's date as YYYY-MM-DD (for attendance keys). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Age in years from a date of birth. */
export function ageFrom(dob: string | Date): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}
