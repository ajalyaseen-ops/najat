/**
 * i18n configuration — Arabic-first, RTL by default.
 * We use next-intl WITHOUT locale-prefixed routing: the active locale lives in
 * a cookie so switching is instant and URLs stay clean (e.g. /students, not
 * /ar/students). `dir` is derived from the locale and applied on <html>.
 */
export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeNames: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

/** Text direction per locale. */
export const localeDir: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export const LOCALE_COOKIE = "madrasati_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
