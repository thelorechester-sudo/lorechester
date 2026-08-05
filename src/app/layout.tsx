import type { Metadata } from "next";
import { Archivo, Roboto_Mono } from "next/font/google";

import { Analytics } from "@/components/analytics";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const mono = Roboto_Mono({
  variable: "--font-mono-brand",
  subsets: ["latin"],
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
      className={`${archivo.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
