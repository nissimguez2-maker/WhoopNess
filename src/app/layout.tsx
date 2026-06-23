import type { Metadata, Viewport } from "next";
import { Fustat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/BottomNav";

// Fustat — humanist, rounded, warm. One family for everything (headings, body, numbers).
const fustat = Fustat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-fustat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhoopNess",
  description: "Your private daily training, read from your WHOOP.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "WhoopNess" },
};

export const viewport: Viewport = {
  themeColor: "#FBF5DD",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${fustat.variable}`}>
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
