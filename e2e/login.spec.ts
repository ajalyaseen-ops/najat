import { test, expect } from "@playwright/test";

/**
 * Smoke test: the app boots, redirects to login, renders the Arabic RTL shell,
 * and guards protected routes. (Auth-success flows require a seeded Supabase
 * test project — see docs/18-testing-strategy.md.)
 */
test("unauthenticated user is sent to the login screen", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login page renders RTL and shows the sign-in form", async ({ page }) => {
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(page.getByLabel(/البريد|Email/)).toBeVisible();
  await expect(page.getByLabel(/كلمة المرور|Password/)).toBeVisible();
});
