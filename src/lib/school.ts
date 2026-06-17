import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ActiveSchool = {
  id: string | null;
  nameAr: string;
  nameEn: string | null;
  logoUrl: string | null;
  theme: Record<string, string> | null;
  calendar: "gregorian" | "hijri";
};

const FALLBACK: ActiveSchool = {
  id: null,
  nameAr: "مدرستي",
  nameEn: "Madrasati",
  logoUrl: null,
  theme: null,
  calendar: "gregorian",
};

/**
 * The school the signed-in user belongs to (branding + calendar). Cached per
 * request. Falls back to app defaults before any school is configured.
 */
export const getActiveSchool = cache(async (schoolId: string | null): Promise<ActiveSchool> => {
  if (!schoolId) return FALLBACK;
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id, name_ar, name_en, logo_url, theme, calendar")
    .eq("id", schoolId)
    .single();
  if (!data) return FALLBACK;
  return {
    id: data.id,
    nameAr: data.name_ar,
    nameEn: data.name_en,
    logoUrl: data.logo_url,
    theme: data.theme,
    calendar: data.calendar,
  };
});
