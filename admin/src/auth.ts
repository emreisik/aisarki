import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { isAdminRole, type UserRole } from "@/lib/roles";

type AuthUserRow = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  password_hash: string | null;
  role: string;
  banned_at: string | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 4 * 60 * 60 }, // 4 saat
  pages: { signIn: "/login" },
  // Eski AUTH_SECRET ile şifrelenmiş cookie'ler yeni secret ile decrypt edilemez.
  // Auth.js null session döner (güvenli) — sadece log'u yutuyoruz ki
  // geliştirme ortamı temiz kalsın. Cookie /api/auth/reset ile silinebilir.
  logger: {
    error(error) {
      if (
        error?.name === "JWTSessionError" ||
        /no matching decryption secret/i.test(error?.message ?? "")
      ) {
        return;
      }
      console.error(error);
    },
    warn(code) {
      console.warn(code);
    },
    debug() {
      /* sessiz */
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rows = (await sql`
          SELECT id, email, username, display_name, avatar_url,
                 password_hash, role, banned_at
          FROM users
          WHERE email = ${credentials.email as string}
          LIMIT 1
        `) as AuthUserRow[];

        if (rows.length === 0) return null;
        const u = rows[0];

        if (u.banned_at) return null;
        if (!u.password_hash) return null;
        if (!isAdminRole(u.role)) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          u.password_hash,
        );
        if (!valid) return null;

        return {
          id: u.id,
          email: u.email,
          name: u.display_name,
          image: u.avatar_url,
          username: u.username,
          role: u.role as UserRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.username = token.username as string | undefined;
      }
      return session;
    },
  },
});
