import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, CardContent } from "@/components/ui/card";

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding panel — logo + slogan. The School Branding module swaps the
          logo/colors per school. */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xl font-bold">{t("app.name")}</p>
            <p className="text-sm text-primary-foreground/70">{t("app.tagline")}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-snug">
            {t("dashboard.title")}
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            {t("auth.loginSubtitle")}
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">© {t("app.name")}</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center p-6">
        <div className="absolute end-4 top-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-2 lg:items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
