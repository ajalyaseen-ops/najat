import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { localeDir, type Locale } from "@/i18n/config";
import { IntlProvider } from "@/components/intl-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مدرستي — نظام إدارة المدارس",
  description: "Madrasati — Enterprise School ERP & Academic Management System",
  applicationName: "مدرستي",
  manifest: "/manifest.json",
  // Makes "Add to Home Screen" on iOS open full-screen (no Safari chrome).
  appleWebApp: {
    capable: true,
    title: "مدرستي",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#16305b",
  width: "device-width",
  initialScale: 1,
  // Extend under the notch / home indicator in standalone mode.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = localeDir[locale] ?? "rtl";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${cairo.variable} font-sans antialiased`}>
        <IntlProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
          <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} richColors closeButton />
        </IntlProvider>
      </body>
    </html>
  );
}
