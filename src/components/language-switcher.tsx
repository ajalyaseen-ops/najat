"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames, type Locale } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/** Instant language toggle (Arabic ⇄ English). Persists via cookie. */
export function LanguageSwitcher() {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Language">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => startTransition(() => void setLocale(loc))}
            className={loc === current ? "font-semibold text-primary" : ""}
          >
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
