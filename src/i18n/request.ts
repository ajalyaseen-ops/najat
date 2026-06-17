import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Server-side resolution of the active locale + messages for every request.
 * Locale is read from the cookie set by the language switcher; falls back to
 * Arabic. Messages are loaded from src/messages/<locale>.json.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // Safety net: a missing translation key renders its last segment instead of
    // throwing a 500. Real misses still surface in dev logs.
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) return;
      console.error(error);
    },
    getMessageFallback({ key }) {
      return key.split(".").pop() ?? key;
    },
  };
});
