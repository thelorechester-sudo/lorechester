import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";

import { Analytics } from "@/components/analytics";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Lorechester",
    template: "%s — Lorechester",
  },
  description:
    "Lorechester — uncommon wear on your terraces. Heavyweight cut-and-sew, printed in small runs. Shipped across Indonesia.",
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
      </body>
    </html>
  );
}
