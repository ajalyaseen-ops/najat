import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

/** Entry point: send authenticated users to the dashboard, others to login. */
export default async function Home() {
  const profile = await getSessionProfile();
  redirect(profile ? "/dashboard" : "/login");
}
