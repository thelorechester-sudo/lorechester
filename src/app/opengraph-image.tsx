import { ImageResponse } from "next/og";

/** Default social preview card, used wherever a page has no image of its own. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lorechester";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          color: "#FFFFFF",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8A8A8A",
          }}
        >
          Jongeren uit Zuidoost-Azië
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 600,
              letterSpacing: -4,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            Lorechester
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 30,
              color: "#B5B5B5",
            }}
          >
            Uncommon wear on your terraces.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#8A8A8A",
          }}
        >
          <div style={{ display: "flex", width: 56, height: 3, background: "#8B0000" }} />
          Shop the drop
        </div>
      </div>
    ),
    size,
  );
}
