import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./rbac";

export type SessionProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  schoolId: string | null;
  avatarUrl: string | null;
};

/**
 * Resolve the signed-in user + their profile (role, school) for the current
 * request. Cached per-request so multiple layout/page calls hit the DB once.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, school_id, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Authenticated but no profile row yet (trigger backfill pending).
    return {
      id: user.id,
      email: user.email ?? null,
      fullName: user.email ?? null,
      role: "teacher",
      schoolId: null,
      avatarUrl: null,
    };
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
    schoolId: profile.school_id,
    avatarUrl: profile.avatar_url,
  };
});

/** Use in protected pages/layouts: returns the profile or redirects to /login. */
export async function requireSession(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}
