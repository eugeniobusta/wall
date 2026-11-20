import type { MetadataRoute } from "next";

// Installing from the browser gives a full screen app that opens straight into the editor.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wall",
    short_name: "Wall",
    description: "Your projected whiteboard.",
    start_url: "/edit",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
