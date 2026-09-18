import type { Metadata } from "next";
import { Domine, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const domine = Domine({
  variable: "--font-domine",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TimberCraft 3D Studio",
  description: "Configure a shed in 3D — style, siding, roof, and size.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${domine.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-full flex-col">{children}</body>
    </html>
  );
}
