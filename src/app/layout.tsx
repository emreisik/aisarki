import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/contexts/PlayerContext";
import PlayerShell from "@/components/PlayerShell";
import AppShell from "@/components/AppShell";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "AI Şarkı – Yapay Zeka ile Müzik Oluştur",
  description:
    "aisarki.com – Saniyeler içinde yapay zeka ile özgün şarkılar oluşturun.",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full">
        <SessionProvider>
          <PlayerProvider>
            <PlayerShell />
            <AppShell>{children}</AppShell>
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
