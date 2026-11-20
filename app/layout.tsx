import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/caveat/600.css";
import "@fontsource/caveat/700.css";
import "./globals.css";
import { SITE } from "@/lib/config";

const description = "A projected smart whiteboard. Calendar, reminders and deadlines lit onto the wall beside your desk, edited from your phone or by voice.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Wall", template: "%s · Wall" },
  description,
  applicationName: "Wall",
  appleWebApp: { capable: true, title: "Wall", statusBarStyle: "black-translucent" },
  openGraph: { title: "Wall, a whiteboard that writes itself", description, url: SITE.url, siteName: "Wall", images: ["/og.png"], type: "website" },
  twitter: { card: "summary_large_image", title: "Wall, a whiteboard that writes itself", description, images: ["/og.png"] },
};
export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
