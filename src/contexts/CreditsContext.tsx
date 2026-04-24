"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

export interface CreditsSnapshot {
  balance: number;
  planCredits: number;
  addonCredits: number;
  nextRefreshAt: string | null;
}

export interface PlanSnapshot {
  id: "free" | "pro" | "premier";
  name: string;
  monthlyCredits: number;
  refreshPeriod: "daily" | "monthly";
  features: {
    models: string[];
    commercialUse: boolean;
    uploadMaxMinutes: number;
    stems: boolean;
    wavDownload: boolean;
    addOnCredits: boolean;
    priorityQueue: boolean;
    earlyAccess: boolean;
    voiceTuning: boolean;
  };
}

export interface CreditsCtx {
  credits: CreditsSnapshot | null;
  plan: PlanSnapshot | null;
  costs: Record<string, number>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CreditsCtx | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [credits, setCredits] = useState<CreditsSnapshot | null>(null);
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setCredits(null);
      setPlan(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me/credits", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCredits(data.credits);
      setPlan(data.plan);
      setCosts(data.costs ?? {});
    } catch {
      /* sessizce */
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (status === "authenticated") {
      pollingRef.current = setInterval(refresh, 30_000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refresh, status]);

  return (
    <Ctx.Provider value={{ credits, plan, costs, loading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCredits(): CreditsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCredits must be used within CreditsProvider");
  return c;
}
