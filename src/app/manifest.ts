import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WhoopNess",
    short_name: "WhoopNess",
    description: "Your private daily training decision, read from your WHOOP data.",
    start_url: "/?source=pwa",
    id: "/?source=pwa",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF5DD",
    theme_color: "#FBF5DD",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
