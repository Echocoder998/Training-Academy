import Link from "next/link";
import { requireUser } from "@/lib/session";
import { signOut } from "@/auth";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <>
      <header className="topbar">
        <div className="inner">
          {/* To use the official logo, put the white SVG in /public/brand/ and swap this block for an <img>. */}
          <Link href="/" className="brand" aria-label="MCE Sales Academy home">
            <span className="mark">MCE</span>
            <span className="divider" />
            <span className="name">Sales Academy</span>
          </Link>
          <Nav admin={me.role === "admin"} />
          <div className="userbox">
            <span>{me.name}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/sign-in" }); }}>
              <button>Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="redline" />
      {children}
      <footer className="site">
        <div className="inner">
          <span>MCE Sales Academy · Internal training</span>
          <span>We solve problems.</span>
        </div>
      </footer>
    </>
  );
}
