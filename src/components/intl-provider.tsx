"use client";

import { NextIntlClientProvider, IntlErrorCode, type AbstractIntlMessages } from "next-intl";

/**
 * Client wrapper for next-intl that degrades gracefully: a missing key renders
 * its last segment rather than crashing the page. (Function props like onError
 * can't cross the server→client boundary, so they live here in a client module.)
 */
export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === IntlErrorCode.MISSING_MESSAGE) return;
        console.error(error);
      }}
      getMessageFallback={({ key }) => key.split(".").pop() ?? key}
    >
      {children}
    </NextIntlClientProvider>
  );
}
