import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

const providers = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Şifre", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      // Tablo yoksa oluştur
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          email         TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          username      TEXT UNIQUE NOT NULL,
          display_name  TEXT NOT NULL,
          avatar_url    TEXT,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      const rows = await sql`
        SELECT id, email, username, display_name, avatar_url, password_hash
        FROM users
        WHERE email = ${credentials.email as string}
        LIMIT 1
      `;

      if (rows.length === 0) return null;

      const user = rows[0];
      if (!user.password_hash) return null;

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.password_hash as string,
      );
      if (!valid) return null;

      return {
        id: user.id as string,
        email: user.email as string,
        name: user.display_name as string,
        image: user.avatar_url as string | null,
        username: user.username as string,
      };
    },
  }),
];

// Google OAuth — sadece env değişkenleri varsa ekle
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Google = require("next-auth/providers/google").default;
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { username?: string }).username =
          token.username as string;
      }
      return session;
    },
  },
});
