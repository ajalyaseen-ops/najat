/**
 * Brand mark used to generate the app icons (favicon, Apple touch icon, and
 * the PWA manifest icons) at build time via next/og ImageResponse.
 * The logo is an inline SVG (graduation cap + book) rasterized to PNG.
 */
export const BRAND_NAVY = "#16305b";

export const BRAND_LOGO_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<path d="M32 14 8 24l24 10 24-10-24-10z" fill="#ffffff"/>` +
      `<path d="M18 31v10c0 4 6.3 7 14 7s14-3 14-7V31l-14 6-14-6z" fill="#2f9e6b"/>` +
      `<rect x="52" y="24" width="2.6" height="14" rx="1.3" fill="#ffffff"/>` +
      `</svg>`
  );
