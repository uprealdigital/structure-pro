import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TimberCraft 3D Studio",
    short_name: "TimberCraft",
    description: "Configure a building in 3D — style, siding, roof, and size.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f9f9fb",
    theme_color: "#121314",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
