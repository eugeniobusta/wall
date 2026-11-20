import type { Metadata } from "next";

// A private page: keep it out of search engines.
export const metadata: Metadata = { title: "Edit", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
