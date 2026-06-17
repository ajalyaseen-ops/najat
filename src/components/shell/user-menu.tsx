"use client";

import { useTranslations } from "next-intl";
import { LogOut, User } from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { initials } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}) {
  const t = useTranslations("auth");
  const locale = useLocale() as "ar" | "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-full p-1 outline-none hover:bg-muted">
        <Avatar className="h-9 w-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="hidden text-start sm:block">
          <p className="text-sm font-medium leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]?.[locale]}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium">{name}</p>
          <p dir="ltr" className="text-xs font-normal text-muted-foreground">
            {email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User /> {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button type="submit" className="w-full">
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut /> {t("logout")}
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
