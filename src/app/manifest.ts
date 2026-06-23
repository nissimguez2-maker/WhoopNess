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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
