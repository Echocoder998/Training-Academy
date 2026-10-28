import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type Me = { personId: string; role: "learner" | "admin"; name: string; email: string; image?: string | null };

/** For pages: returns the signed-in person or sends them to sign in. */
export async function requireUser(): Promise<Me> {
  const s = await auth();
  if (!s?.user?.personId) redirect("/sign-in");
  return { personId: s.user.personId, role: s.user.role, name: s.user.name || s.user.email || "", email: s.user.email || "", image: s.user.image };
}

export async function requireAdmin(): Promise<Me> {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/");
  return me;
}

/** For API routes / server actions: returns null instead of redirecting. */
export async function currentUser(): Promise<Me | null> {
  const s = await auth();
  if (!s?.user?.personId) return null;
  return { personId: s.user.personId, role: s.user.role, name: s.user.name || s.user.email || "", email: s.user.email || "", image: s.user.image };
}
