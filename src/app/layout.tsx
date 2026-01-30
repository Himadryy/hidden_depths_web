/*
 * HIDDEN DEPTHS - DIGITAL SANCTUARY
 * Copyright (c) 2026 Himadryy. All Rights Reserved.
 *
 * This source code is licensed under the AGPL-3.0 License.
 * unauthorized copying, modification, or distribution of this code,
 * via any medium, without strict adherence to the license terms is prohibited.
 *
 * "The deeper you go, the more you find."
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { PerformanceProvider } from "@/context/PerformanceProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { AuthProvider } from "@/context/AuthProvider";
import SmoothScroll from "@/components/SmoothScroll";
import DebugPanel from "@/components/DebugPanel";
import SoundController from "@/components/SoundController";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
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
  metadataBase: new URL("https://hidden-depths-web.pages.dev"),
  title: "Hidden Depths | A Space to Think",
  description: "A digital sanctuary for clarity and guided thinking. Not therapy, but a space to find your own answers through focused anonymity.",
  keywords: ["mental health", "reflection", "meditation", "digital sanctuary", "hidden depths"],
  authors: [{ name: "Himadryy" }],
  openGraph: {
    title: "Hidden Depths | A Space to Think",
    description: "Ventures into the void of your own mind. A digital sanctuary for clarity.",
    url: "https://hidden-depths-web.pages.dev", // Update this if you have a custom domain
    siteName: "Hidden Depths",
    images: [
      {
        url: "/assets/wellbeing.jpg", // We use one of your assets as the preview for now
        width: 1200,
        height: 630,
        alt: "Hidden Depths Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hidden Depths",
    description: "A digital sanctuary for clarity and guided thinking.",
    images: ["/assets/wellbeing.jpg"],
  },
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
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} antialiased overscroll-none`}
      >
        <ThemeProvider>
          <PerformanceProvider>
            <AuthProvider>
              <SmoothScroll>
                {children}
                <SoundController />
                <DebugPanel />
              </SmoothScroll>
            </AuthProvider>
          </PerformanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
