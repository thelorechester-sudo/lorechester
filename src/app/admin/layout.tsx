import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  // The back office must never appear in search results.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-col bg-paper">{children}</div>;
}
