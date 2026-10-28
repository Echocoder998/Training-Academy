import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, t } from "@/db";

export type Me = { personId: string; role: "learner" | "admin"; name: string; email: string; image?: string | null; testMode: boolean };

/**
 * TEST MODE (no sign-in): on when no sign-in method is configured.
 * Each browser gets its own tester profile (kept in a cookie), and everyone is an admin.
 * Sign-in turns on automatically once ACCESS_CODE or the Microsoft Entra ID settings are added.
 */
export const GUEST_COOKIE = "academy_tester";
export const testMode = () =>
  !process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  !process.env.ACCESS_CODE &&
  !(process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production");

async function guest(): Promise<Me | null> {
  const id = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [p] = await db().select().from(t.people).where(eq(t.people.id, id));
  if (!p) return null;
  return { personId: p.id, role: "admin", name: p.name || "Tester", email: p.email, image: null, testMode: true };
}

/** For pages: returns the current person, or sets one up (test mode) / sends them to sign in. */
export async function requireUser(): Promise<Me> {
  if (testMode()) {
    const g = await guest();
    if (!g) redirect("/start");
    return g;
  }
  const s = await auth();
  if (!s?.user?.personId) redirect("/sign-in");
  return { personId: s.user.personId, role: s.user.role, name: s.user.name || s.user.email || "", email: s.user.email || "", image: s.user.image, testMode: false };
}

export async function requireAdmin(): Promise<Me> {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/");
  return me;
}

/** For API routes / server actions: returns null instead of redirecting. */
export async function currentUser(): Promise<Me | null> {
  if (testMode()) return guest();
  const s = await auth();
  if (!s?.user?.personId) return null;
  return { personId: s.user.personId, role: s.user.role, name: s.user.name || s.user.email || "", email: s.user.email || "", image: s.user.image, testMode: false };
}
