import { NextResponse } from "next/server";
import { db, t } from "@/db";
import { GUEST_COOKIE, testMode } from "@/lib/session";

/** Test mode: creates a tester profile for this browser and remembers it in a cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!testMode()) return NextResponse.redirect(new URL("/sign-in", url));
  const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
  const [p] = await db().insert(t.people)
    .values({ email: `tester-${crypto.randomUUID()}@test.local`, name: `Tester ${tag}`, role: "admin" })
    .returning({ id: t.people.id });
  const res = NextResponse.redirect(new URL("/", url));
  res.cookies.set(GUEST_COOKIE, p.id, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
