import { ImageResponse } from "next/og";
import { BRAND_LOGO_SVG, BRAND_NAVY } from "@/lib/brand-mark";

// 512px PNG for the manifest — also used as the maskable icon. The logo sits
// inside the central safe zone so adaptive (circular) masks don't clip it.
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
        <img src={BRAND_LOGO_SVG} width={300} height={300} alt="" />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
