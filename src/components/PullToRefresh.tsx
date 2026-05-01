"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { haptics } from "@/lib/haptics";

type Props = {
  /** Refresh tetiklendiğinde çağrılır — promise dönerse spinner bekler */
  onRefresh: () => void | Promise<void>;
  /** İçeriği render eder */
  children: ReactNode;
  /** Pull gesture'ı kapatmak için (modal açıkken vs) */
  disabled?: boolean;
  /** Scroll'u takip edeceği element id (varsayılan: main-scroll) */
  scrollContainerId?: string;
};

const THRESHOLD = 70;
const MAX_PULL = 120;

/**
 * Native iOS/Android pull-to-refresh mimic'i.
 * - Sayfa scroll'u en üstte (scrollTop===0)
 * - Aşağı sürükleme rubber-band ile damped (yarı hız)
 * - 70px eşiği aşılırsa onRefresh tetiklenir, spinner gösterilir
 * - Eşik altında spring snap-back
 */
export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  scrollContainerId = "main-scroll",
}: Props) {
  const [pull, setPull] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const engaged = useRef(false);
  const triggeredHaptic = useRef(false);

  const getScrollEl = () =>
    typeof document !== "undefined"
      ? document.getElementById(scrollContainerId)
      : null;

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    if (e.touches.length !== 1) return;
    const scrollEl = getScrollEl();
    if (scrollEl && scrollEl.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    engaged.current = false;
    triggeredHaptic.current = false;
    setSnapping(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing || disabled) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      if (engaged.current) setPull(0);
      return;
    }
    const scrollEl = getScrollEl();
    if (scrollEl && scrollEl.scrollTop > 0) {
      if (engaged.current) setPull(0);
      return;
    }
    engaged.current = true;
    // Damped pull (rubber band)
    const damped = Math.min(MAX_PULL, dy * 0.5);
    setPull(damped);
    // Eşik geçildiğinde tek seferlik haptic
    if (damped >= THRESHOLD && !triggeredHaptic.current) {
      triggeredHaptic.current = true;
      haptics.refresh();
    } else if (damped < THRESHOLD && triggeredHaptic.current) {
      triggeredHaptic.current = false;
    }
  };

  const onTouchEnd = async () => {
    const wasEngaged = engaged.current;
    engaged.current = false;
    startY.current = null;
    if (!wasEngaged) return;
    setSnapping(true);
    if (pull >= THRESHOLD) {
      // Refresh tetiklendi — spinner görünsün
      setPull(THRESHOLD);
      setRefreshing(true);
      const start = Date.now();
      try {
        await onRefresh();
      } catch {
        // hatayı sessizce yut
      } finally {
        // En az 600ms görünür kalsın (rasgele kısa gözükmesin)
        const elapsed = Date.now() - start;
        const wait = Math.max(0, 600 - elapsed);
        setTimeout(() => {
          setPull(0);
          setRefreshing(false);
          setTimeout(() => setSnapping(false), 320);
        }, wait);
      }
    } else {
      setPull(0);
      setTimeout(() => setSnapping(false), 320);
    }
  };

  const indicatorRotate = refreshing
    ? 0
    : Math.min(360, (pull / THRESHOLD) * 270);
  const indicatorOpacity = Math.min(1, pull / 30);

  return (
    <div
      className="relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Spinner indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
        style={{
          top: 0,
          height: pull,
          opacity: indicatorOpacity,
          transition: snapping
            ? "height 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.32s"
            : "none",
        }}
      >
        <div className="flex items-center justify-center pt-3">
          <div
            className="w-9 h-9 rounded-full bg-[#0d0d0d]/95 backdrop-blur-md border border-[#19b35c]/30 flex items-center justify-center shadow-lg"
            style={{ boxShadow: "0 8px 24px rgba(25, 179, 92, 0.3)" }}
          >
            <ArrowClockwise
              size={18}
              weight="bold"
              className={`text-[#19b35c] ${refreshing ? "animate-spin" : ""}`}
              style={{
                transform: refreshing ? "" : `rotate(${indicatorRotate}deg)`,
                transition: snapping ? "transform 0.32s" : "none",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: snapping
            ? "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "none",
          willChange: pull > 0 ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
