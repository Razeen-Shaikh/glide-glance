import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validations";
import { rateLimit } from "@/lib/rate-limit";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

providers.push(
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase();
      try {
        rateLimit(`login:${email}`, 8, 15 * 60 * 1000);
      } catch {
        return null;
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash || !user.isActive) return null;
      const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!matches) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers,
  logger: {
    error(error) {
      // Stale cookies after AUTH_SECRET changes are cleared in proxy/session.
      if (error?.name === "JWTSessionError") return;
      console.error(`[auth][error] ${error.name}: ${error.message}`);
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "CUSTOMER";
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.id) return true;
      const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      });
      if (!record) return true;
      return record.isActive;
    },
  },
});
