"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";

export type ToastVariant = "error" | "success" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  /** Auto-dismiss süresi (ms). Default: 10_000. 0 → manuel kapatılana kadar */
  duration?: number;
}

interface ToastApi {
  show: (input: Omit<ToastItem, "id">) => string;
  error: (title: string, message?: string) => string;
  success: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 10_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (input: Omit<ToastItem, "id">): string => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const duration = input.duration ?? DEFAULT_DURATION;
      setItems((prev) => [...prev.slice(-4), { ...input, id }]); // max 5 visible
      if (duration > 0) {
        const handle = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  // Cleanup tüm timer'lar component unmount'ta
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api: ToastApi = {
    show,
    error: (title, message) => show({ variant: "error", title, message }),
    success: (title, message) => show({ variant: "success", title, message }),
    info: (title, message) => show({ variant: "info", title, message }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Sessizce no-op ile çık — provider unutulursa app çökmesin
    if (typeof window !== "undefined") {
      console.warn("[useToast] ToastProvider yok — toast çağrısı no-op döndü.");
    }
    const noop = () => "";
    return {
      show: noop,
      error: noop,
      success: noop,
      info: noop,
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] flex flex-col items-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),16px)] pointer-events-none">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const palette =
    item.variant === "error"
      ? {
          bg: "bg-[#e1502a]",
          icon: AlertCircle,
          titleText: "text-black",
          msgText: "text-black/75",
          closeText: "text-black/70 hover:text-black hover:bg-black/10",
        }
      : item.variant === "success"
        ? {
            bg: "bg-[#19b35c]",
            icon: CheckCircle2,
            titleText: "text-black",
            msgText: "text-black/75",
            closeText: "text-black/70 hover:text-black hover:bg-black/10",
          }
        : {
            bg: "bg-[#1a1a1a]",
            icon: Info,
            titleText: "text-white",
            msgText: "text-white/70",
            closeText: "text-white/60 hover:text-white hover:bg-white/10",
          };

  const Icon = palette.icon;

  return (
    <div
      role="alert"
      className={`pointer-events-auto w-full max-w-[560px] rounded-[16px] ${palette.bg} shadow-2xl shadow-black/40 transition-all duration-200 ease-out ${
        enter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon
          size={18}
          className={`flex-shrink-0 mt-0.5 ${palette.titleText}`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-[15px] font-semibold leading-snug ${palette.titleText}`}
          >
            {item.title}
          </p>
          {item.message && (
            <p className={`text-[13px] mt-0.5 leading-snug ${palette.msgText}`}>
              {item.message}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Kapat"
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${palette.closeText}`}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
