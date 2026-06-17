import { ImageResponse } from "next/og";
import { BRAND_LOGO_SVG, BRAND_NAVY } from "@/lib/brand-mark";

// PNG icon referenced by the web app manifest (Android install).
// Generated on-demand and CDN-cached (never blocks the build).
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_NAVY,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_LOGO_SVG} width={124} height={124} alt="" />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
