import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhoopNess",
  description: "Your private daily training decision, read from your WHOOP data.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "WhoopNess" },
};

export const viewport: Viewport = {
  themeColor: "#0A0C10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          {/* Single column, mobile-first; centered on larger screens. */}
          <main className="mx-auto min-h-dvh w-full max-w-[480px] px-4 pb-24 pt-4">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
