import { requireRole } from "@/lib/requireRole";
import { countOpenReports } from "@/lib/reports";
import Sidebar from "./Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("support");

  // Open reports sayısı — sidebar badge'i için. Hata yutulur (ilk load riskli değil).
  let openReports = 0;
  try {
    openReports = await countOpenReports();
  } catch {
    // sessiz
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar
        adminName={session.user.name ?? session.user.email ?? "Admin"}
        adminRole={session.user.role}
        openReports={openReports}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
