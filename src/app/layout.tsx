import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PerformanceProvider } from "@/context/PerformanceProvider";
import SmoothScroll from "@/components/SmoothScroll";
import DebugPanel from "@/components/DebugPanel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom for "app-like" feel
  themeColor: "#000000",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Hidden Depths | A Space to Think",
  description: "A digital sanctuary for clarity and guided thinking. Not therapy, but a space to find your own answers through focused anonymity.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hidden Depths",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overscroll-none`}
      >
        <PerformanceProvider>
          <SmoothScroll>
            {children}
            {process.env.NODE_ENV === 'development' && <DebugPanel />}
          </SmoothScroll>
        </PerformanceProvider>
      </body>
    </html>
  );
}
