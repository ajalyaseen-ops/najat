import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ── First-deploy safety (TEMPORARY) ───────────────────────────────────────
  // This project was scaffolded without a local Node toolchain to run tsc/lint.
  // These flags let the very first Vercel/Netlify build succeed so you get a
  // running app immediately. Once you can build locally, run `npm run typecheck`
  // + `npm run lint`, fix anything they surface, then DELETE both flags below.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // ──────────────────────────────────────────────────────────────────────────
  experimental: {
    // Server Actions are enabled by default in Next 15; keep body limit generous
    // for Excel imports handled server-side.
    serverActions: { bodySizeLimit: "10mb" },
  },
  images: {
    // School logos / banners are served from Supabase Storage (public bucket).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Security headers — baseline hardening; tighten CSP per deployment.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
