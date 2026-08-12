import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon PNG — Google & mobile use this more reliably than SVG text. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0e",
          borderRadius: 7,
          border: "1.5px solid rgba(0,180,255,0.45)",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#7df0ff",
            letterSpacing: "-0.04em",
            fontFamily: "Arial Black, Arial, sans-serif",
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size },
  );
}
