import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The back office, the payment step, and per-order pages must never be
      // crawled — order numbers in a search index would be a data leak.
      disallow: ["/admin", "/checkout", "/orders", "/api"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
