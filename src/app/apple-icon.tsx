import { ImageResponse } from "next/og";
import { BRAND_LOGO_SVG, BRAND_NAVY } from "@/lib/brand-mark";

// iOS "Add to Home Screen" icon (Next auto-injects <link rel="apple-touch-icon">).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <img src={BRAND_LOGO_SVG} width={120} height={120} alt="" />
      </div>
    ),
    size
  );
}
