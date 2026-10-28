import type { Metadata, Viewport } from "next";
import { Domine, Inter } from "next/font/google";
import { ConfiguratorShareRedirect } from "@/src/common/components/configurator-share-redirect";
import { DebugLogPill } from "@/src/common/components/debug-log-pill";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const domine = Domine({
  variable: "--font-domine",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121314",
};

export const metadata: Metadata = {
  applicationName: "TimberCraft",
  title: "TimberCraft 3D Studio",
  description: "Configure a building in 3D — style, siding, roof, and size.",
  appleWebApp: {
    capable: true,
    title: "TimberCraft",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${domine.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-full flex-col">
        {children}
        <ConfiguratorShareRedirect />
        {process.env.NODE_ENV === "development" ? <DebugLogPill /> : null}
      </body>
    </html>
  );
}
