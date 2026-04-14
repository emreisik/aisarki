"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Bell } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PWAManager() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  useEffect(() => {
    // Service Worker kaydet
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Background Sync desteği varsa register et
          if ("sync" in reg) {
            (
              reg as ServiceWorkerRegistration & {
                sync: { register: (tag: string) => Promise<void> };
              }
            ).sync
              .register("generate-queue")
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    // Standalone modda mı?
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Mevcut bildirim izni
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
      // Standalone'da izin verilmemişse banner göster (5 saniye sonra)
      if (standalone && Notification.permission === "default") {
        setTimeout(() => setShowNotifBanner(true), 5000);
      }
    }

    if (standalone) return;

    // Daha önce kapatıldıysa gösterme (24 saat)
    const ts = localStorage.getItem("pwa_dismissed");
    if (ts && Date.now() - Number(ts) < 86400000) {
      setDismissed(true);
      return;
    }

    // iOS tespiti
    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa_dismissed", String(Date.now()));
    setDismissed(true);
    setShowIOSGuide(false);
  };

  const handleInstallAndroid = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
    else handleDismiss();
  };

  const requestNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    setShowNotifBanner(false);

    if (permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
        }),
      });
    } catch {
      // Push subscribe başarısız — sessizce geç
    }
  };

  // ── Bildirim izin banner'ı (standalone modda, izin verilmemişse) ──
  if (showNotifBanner && notifPermission === "default") {
    return (
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] md:bottom-[calc(90px+8px)] left-3 right-3 md:left-auto md:right-4 md:w-80 z-50 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-slide-up">
        <div className="w-10 h-10 rounded-xl bg-[#1db954] flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold">Bildirimler</p>
          <p className="text-[#a7a7a7] text-xs mt-0.5">
            Şarkın hazır olunca haber verelim
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={requestNotifications}
            className="bg-[#1db954] text-black text-xs font-bold px-3 py-1.5 rounded-full pressable hover:bg-[#1ed760] transition-colors"
          >
            İzin ver
          </button>
          <button
            onClick={() => setShowNotifBanner(false)}
            className="p-1.5 text-[#535353] hover:text-white pressable"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Kurulu, kapatıldı, veya hiç uygun değil
  if (isStandalone || dismissed) return null;
  if (!installPrompt && !isIOS) return null;

  return (
    <>
      {/* ── Install Banner ── */}
      {!showIOSGuide && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] md:bottom-[calc(90px+8px)] left-3 right-3 md:left-auto md:right-4 md:w-80 z-50 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-[#1db954] flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold">Uygulamayı Yükle</p>
            <p className="text-[#a7a7a7] text-xs mt-0.5">
              {isIOS
                ? "Ana ekrana ekle, arka planda çal"
                : "Hızlı erişim, arka planda müzik"}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={
                isIOS ? () => setShowIOSGuide(true) : handleInstallAndroid
              }
              className="bg-[#1db954] text-black text-xs font-bold px-3 py-1.5 rounded-full pressable hover:bg-[#1ed760] transition-colors"
            >
              Yükle
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-[#535353] hover:text-white pressable"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── iOS Kılavuzu ── */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-[env(safe-area-inset-bottom,0px)]"
          onClick={handleDismiss}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative z-10 w-full max-w-sm bg-[#1a1a1a] rounded-t-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">
                Ana Ekrana Ekle
              </h3>
              <button
                onClick={handleDismiss}
                className="text-[#535353] hover:text-white pressable"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <Step n={1}>
                Safari&apos;de alt menüden{" "}
                <span className="inline-flex items-center gap-1 text-[#1db954] font-semibold">
                  Paylaş <Share size={14} />
                </span>{" "}
                butonuna bas
              </Step>
              <Step n={2}>
                Listeyi aşağı kaydır,{" "}
                <span className="text-white font-semibold">
                  &quot;Ana Ekrana Ekle&quot;
                </span>{" "}
                seçeneğine dokun
              </Step>
              <Step n={3}>
                Sağ üstteki{" "}
                <span className="text-[#1db954] font-semibold">Ekle</span>{" "}
                butonuna bas — hazır!
              </Step>
            </div>

            <p className="mt-4 text-[#535353] text-xs text-center">
              Kurulduktan sonra şarkılar arka planda çalmaya devam eder
            </p>

            {/* Kurulumdan sonra bildirim izni */}
            <button
              onClick={() => {
                handleDismiss();
                setTimeout(requestNotifications, 1000);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-white/60 text-sm transition-colors pressable"
            >
              <Bell size={14} />
              Kurulumdan sonra bildirimlere izin ver
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-[#1db954] text-black text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </span>
      <p className="text-[#a7a7a7] text-sm leading-relaxed">{children}</p>
    </div>
  );
}
