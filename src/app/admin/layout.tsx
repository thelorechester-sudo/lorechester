import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  // The back office must never appear in search results.
  robots: { index: false, follow: false },
  // Lets the admin be added to an iPhone Home Screen, which is what unlocks
  // order alerts on iOS (see /admin/notifications).
  manifest: "/lorechester-admin.webmanifest",
  icons: { apple: "/icons/admin-180.png" },
  appleWebApp: { capable: true, title: "LC Admin", statusBarStyle: "default" },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-col bg-paper">{children}</div>;
}
