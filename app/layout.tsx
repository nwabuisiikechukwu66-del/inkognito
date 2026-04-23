/**
 * Root Layout — app/layout.tsx
 *
 * Wraps the entire app with:
 * - ConvexClientProvider (real-time backend)
 * - AnonSessionProvider (anonymous identity management)
 * - Toaster (notifications)
 * - AgeGate (18+ gate rendered client-side)
 * - Global metadata + OG tags
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { AnonSessionProvider } from "@/components/providers/AnonSessionProvider";
import { Toaster } from "react-hot-toast";
import { AgeGate } from "@/components/ui/AgeGate";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Inkognito — Speak Without a Face",
    template: "%s | Inkognito",
  },
  description:
    "Anonymous confessions, random connections, and an AI companion that never judges. Flow in. Stay hidden.",
  keywords: ["anonymous", "confessions", "random chat", "inkognito", "secrets"],
  openGraph: {
    title: "Inkognito — Speak Without a Face",
    description:
      "Anonymous confessions, random connections, and an AI companion that never judges.",
    type: "website",
    siteName: "Inkognito",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Inkognito",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inkognito — Speak Without a Face",
    description: "Anonymous confessions, random connections.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Convex real-time provider wraps entire app */}
        <ConvexClientProvider>
          {/* Anonymous session management (UUID + location) */}
          <AnonSessionProvider>
            {/* 18+ age verification gate */}
            <AgeGate />

            <div className="flex min-h-screen bg-[#050505]">
              {/* Desktop Sidebar */}
              <Sidebar />

              <div className="flex-1 flex flex-col min-h-screen md:ml-64 w-full overflow-x-hidden">
                {/* Top navigation - hidden on desktop since sidebar has it */}
                <div className="md:hidden sticky top-0 z-50">
                  <Navbar />
                </div>

                {/* Page content */}
                <main className="flex-1 relative pb-24 md:pb-12 w-full">{children}</main>

                {/* Site footer — required for AdSense (Terms + Privacy links) */}
                <Footer />
              </div>

              {/* Mobile Bottom Navigation */}
              <BottomNav />
              <InstallPrompt />
            </div>

            {/* Toast notifications — dark themed */}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: "#1a1a1f",
                  color: "#e8e0d5",
                  border: "1px solid #222228",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  borderRadius: "2px",
                },
                success: {
                  iconTheme: { primary: "#c41e3a", secondary: "#0a0a0b" },
                },
              }}
            />
          </AnonSessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
