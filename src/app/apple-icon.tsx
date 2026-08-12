import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0a0a0e 0%, #12141c 100%)",
          borderRadius: 40,
          border: "6px solid rgba(0,180,255,0.4)",
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            color: "#7df0ff",
            letterSpacing: "-0.05em",
            fontFamily: "Arial Black, Arial, sans-serif",
            textShadow: "0 0 40px rgba(0,180,255,0.55)",
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size },
  );
}
