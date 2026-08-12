import { ImageResponse } from "next/og";

export const alt = "AYEBA — recherche mondiale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050507",
          color: "#f5f5f7",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            textShadow: "0 0 60px rgba(0,180,255,0.7)",
          }}
        >
          AYEBA
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            color: "#e85d04",
            fontStyle: "italic",
          }}
        >
          Le monde entier, une requête.
        </div>
      </div>
    ),
    { ...size },
  );
}
