import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { ToastProvider } from "@/contexts/ToastContext";
import AppShell from "@/components/AppShell";
import SessionProvider from "@/components/SessionProvider";
import PWAManager from "@/components/PWAManager";
import RecordSheet from "@/components/RecordSheet";

export const metadata: Metadata = {
  title: "Rifmo – Yapay Zeka ile Müzik Oluştur",
  description:
    "Rifmo – Saniyeler içinde yapay zeka ile özgün şarkılar oluşturun.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rifmo",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/fav.png" type="image/png" />
        <link rel="apple-touch-icon" href="/fav.png" />
      </head>
      <body className="h-full">
        <SessionProvider>
          <ToastProvider>
            <CreditsProvider>
              <PlayerProvider>
                <UploadProvider>
                  <AppShell>{children}</AppShell>
                  <RecordSheet />
                  <PWAManager />
                </UploadProvider>
              </PlayerProvider>
            </CreditsProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
