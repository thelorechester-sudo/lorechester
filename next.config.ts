import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM binary; let Node require it at runtime rather than
  // having the bundler try to inline it.
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [
      {
        // A stale service worker would keep running old push handling, so the
        // browser must always revalidate this one file.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/admin" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Supabase Storage — where images uploaded from the admin land.
      // The brand assets shipped in /public need no entry here.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
