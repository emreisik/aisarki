"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Music,
  FileText,
  Flag,
  Wrench,
  Package,
  Bell,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { logoutAction } from "./actions";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { href: "/users", label: "Users", icon: Users, section: "Accounts" },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    section: "Accounts",
  },
  { href: "/songs", label: "Songs & Tasks", icon: Music, section: "Content" },
  {
    href: "/ledger",
    label: "Credit Ledger",
    icon: FileText,
    section: "Content",
  },
  { href: "/reports", label: "Reports", icon: Flag, section: "Content" },
  { href: "/jobs", label: "Jobs", icon: Wrench, section: "Ops" },
  { href: "/plans", label: "Plans", icon: Package, section: "Ops" },
  { href: "/push", label: "Push", icon: Bell, section: "Ops" },
  { href: "/audit", label: "Audit Log", icon: ShieldAlert, section: "Ops" },
];

export default function Sidebar({
  adminName,
  adminRole,
  openReports = 0,
}: {
  adminName: string;
  adminRole: string;
  openReports?: number;
}) {
  const pathname = usePathname();

  const sections = Array.from(new Set(NAV.map((n) => n.section)));

  const badgeFor = (href: string): number | null => {
    if (href === "/reports" && openReports > 0) return openReports;
    return null;
  };

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
      <div className="h-14 px-4 flex items-center border-b border-[var(--border)]">
        <div className="text-sm font-semibold tracking-tight">Rifmo Admin</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section} className="mb-4">
            <div className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
              {section}
            </div>
            {NAV.filter((n) => n.section === section).map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const badge = badgeFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-[var(--surface3)] text-white"
                      : "text-[var(--text2)] hover:text-white hover:bg-[var(--surface2)]"
                  }`}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                  {badge !== null && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums bg-[var(--danger)] text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3 space-y-2">
        <div className="px-1">
          <div className="text-xs font-medium truncate">{adminName}</div>
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
            {adminRole}
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-[var(--text2)] hover:text-white hover:bg-[var(--surface2)] transition-colors"
          >
            <LogOut size={13} strokeWidth={1.75} />
            Çıkış
          </button>
        </form>
      </div>
    </aside>
  );
}
