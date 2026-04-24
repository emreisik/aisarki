"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import sql from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function loginAction(formData: FormData): Promise<{
  error?: string;
}> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email ve şifre gerekli." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email veya şifre hatalı." };
    }
    // redirect() AuthError değil — tekrar fırlat ki Next yönlendirmeyi yapabilsin
    throw err;
  }

  // Audit: başarılı giriş
  try {
    const rows = (await sql`
      SELECT id, email FROM users WHERE email = ${email} LIMIT 1
    `) as { id: string; email: string }[];
    if (rows[0]) {
      await logAudit({
        adminId: rows[0].id,
        adminEmail: rows[0].email,
        action: "auth.login",
      });
    }
  } catch {
    // Audit hatası login'i bozmaz
  }

  redirect("/");
}
