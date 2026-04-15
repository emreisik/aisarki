import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/contexts/PlayerContext";
import AppShell from "@/components/AppShell";
import SessionProvider from "@/components/SessionProvider";
import PWAManager from "@/components/PWAManager";

export const metadata: Metadata = {
  title: "Hubeya – Yapay Zeka ile Müzik Oluştur",
  description:
    "Hubeya – Saniyeler içinde yapay zeka ile özgün şarkılar oluşturun.",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hubeya",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="icon"
          href="/icon-192.png"
          type="image/png"
          sizes="192x192"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full">
        <SessionProvider>
          <PlayerProvider>
            <AppShell>{children}</AppShell>
            <PWAManager />
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
