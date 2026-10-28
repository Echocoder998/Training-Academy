import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, t } from "@/db";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const providers: Provider[] = [];
// Reads AUTH_MICROSOFT_ENTRA_ID_ID / _SECRET / _ISSUER from the environment.
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) providers.push(MicrosoftEntraID);

// Local testing only. Lets you sign in by typing an email, with no password.
export const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      authorize: async (c) => {
        const email = String(c?.email || "").trim().toLowerCase();
        return email.includes("@") ? { email, name: email.split("@")[0] } : null;
      },
    }),
  );
}

// Team access code: email + shared code, limited to your company email domains.
// Lets you launch before Microsoft sign-in is set up. Remove ACCESS_CODE once Entra ID works.
export const accessCodeEnabled = !!process.env.ACCESS_CODE;
const allowedDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS || "").split(",").map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
const sameCode = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
if (accessCodeEnabled) {
  providers.push(
    Credentials({
      id: "access-code",
      name: "Team access code",
      credentials: { email: { label: "Work email", type: "email" }, name: { label: "Name" }, code: { label: "Access code", type: "password" } },
      authorize: async (c) => {
        const email = String(c?.email || "").trim().toLowerCase();
        const code = String(c?.code || "").trim();
        const domain = email.split("@")[1] || "";
        const domains = allowedDomains();
        if (!email.includes("@") || !sameCode(code, process.env.ACCESS_CODE!)) return null;
        if (domains.length && !domains.includes(domain)) return null;
        const name = String(c?.name || "").trim() || email.split("@")[0];
        return { email, name };
      },
    }),
  );
}

/** Creates or updates the person row and returns its id + role. */
async function upsertPerson(email: string, name?: string | null, image?: string | null) {
  const role = adminEmails().includes(email) ? "admin" : "learner";
  const [row] = await db()
    .insert(t.people)
    .values({ email, name: name ?? null, image: image ?? null, role })
    .onConflictDoUpdate({
      target: t.people.email,
      set: {
        name: sql`coalesce(${name ?? null}, ${t.people.name})`,
        lastActive: new Date(),
        // ADMIN_EMAILS can promote; it never demotes someone made admin in the app.
        ...(role === "admin" ? { role: "admin" as const } : {}),
      },
    })
    .returning({ id: t.people.id, role: t.people.role });
  return row;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const p = await upsertPerson(user.email.toLowerCase(), user.name, user.image);
        token.personId = p.id;
        token.role = p.role;
      } else if (token.personId) {
        // Refresh role occasionally so admin changes apply without signing out.
        const [p] = await db().select({ role: t.people.role }).from(t.people).where(eq(t.people.id, token.personId as string));
        if (p) token.role = p.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.personId = token.personId as string;
      session.user.role = (token.role as "learner" | "admin") ?? "learner";
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: { personId: string; role: "learner" | "admin"; name?: string | null; email?: string | null; image?: string | null };
  }
}
