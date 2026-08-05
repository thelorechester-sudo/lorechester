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
          background: "#0B0B0C",
          color: "#FAF9F6",
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
            color: "#6E6E73",
          }}
        >
          Jongeren uit Zuidoost-Azië
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 900,
              letterSpacing: -8,
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
              color: "#A1A1A6",
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
            color: "#6E6E73",
          }}
        >
          <div style={{ display: "flex", width: 56, height: 3, background: "#E4462B" }} />
          Shop the drop
        </div>
      </div>
    ),
    size,
  );
}
