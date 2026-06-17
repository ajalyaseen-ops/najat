import { ImageResponse } from "next/og";
import { BRAND_LOGO_SVG, BRAND_NAVY } from "@/lib/brand-mark";

// Favicon + general app icon (Next auto-injects <link rel="icon">).
export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
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
        <img src={BRAND_LOGO_SVG} width={168} height={168} alt="" />
      </div>
    ),
    size
  );
}
