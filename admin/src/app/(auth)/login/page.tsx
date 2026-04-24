import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/roles";
import LoginForm from "./LoginForm";

export const metadata = { title: "Giriş · Rifmo Admin" };

async function safeAuth() {
  try {
    return await auth();
  } catch {
    // Bozuk/geçersiz session cookie — null dön, /login'de cookie resetlenir
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const session = await safeAuth();
  if (session?.user && isAdminRole(session.user.role)) {
    redirect("/");
  }

  const params = await searchParams;
  const errorMsg =
    params.error === "forbidden"
      ? "Bu hesabın admin paneline erişim yetkisi yok."
      : undefined;
  const notice =
    params.reset === "1"
      ? "Oturum sıfırlandı. Tekrar giriş yapabilirsin."
      : undefined;

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xl font-semibold tracking-tight">
            Rifmo Admin
          </div>
          <div className="text-sm text-[var(--text2)] mt-1">
            Backoffice girişi
          </div>
        </div>

        {notice && (
          <div className="mb-3 text-xs text-[var(--text2)] bg-[var(--surface2)] border border-[var(--border)] rounded-md px-3 py-2 text-center">
            {notice}
          </div>
        )}

        <LoginForm initialError={errorMsg} />

        <div className="mt-6 text-center">
          <a
            href="/api/auth/reset"
            className="text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          >
            Sorun mu var? Oturumu sıfırla
          </a>
        </div>
      </div>
    </div>
  );
}
