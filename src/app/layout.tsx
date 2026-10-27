import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";

import { Analytics } from "@/components/analytics";
import { NoZoom } from "@/components/no-zoom";
import { siteUrl } from "@/lib/env";
import "./globals.css";

/*
 * One family for everything, the way the reference sets it: 400 for body, 500
 * for the small uppercase labels, 600 for headings. There is no second face —
 * the mono that used to set meta labels is gone with the old brand.
 */
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/*
 * App-like on a phone: fixed scale, no zoom, content may run under the notch
 * (safe-area insets are handled in globals.css). iOS Safari ignores the zoom
 * limits for pinch, so <NoZoom /> backs them up.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "white",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Lorechester",
    template: "%s — Lorechester",
  },
  description:
    "Lorechester — uncommon wear on your terraces. Heavyweight cut-and-sew, printed in small runs. Shipped across Indonesia.",
  // Installable: "Add to Home Screen" opens the store full-screen, like an app.
  manifest: "/lorechester.webmanifest",
  icons: { apple: "/icons/store-180.png" },
  appleWebApp: { capable: true, title: "Lorechester", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "Lorechester",
    locale: "id_ID",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${instrumentSans.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
        <NoZoom />
      </body>
    </html>
  );
}
