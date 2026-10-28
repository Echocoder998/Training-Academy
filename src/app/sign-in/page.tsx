import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, devLoginEnabled, accessCodeEnabled } from "@/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const s = await auth();
  if (s?.user?.personId) redirect("/");
  const { error } = await searchParams;
  const entra = !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID;

  async function codeSignIn(fd: FormData) {
    "use server";
    try {
      await signIn("access-code", { email: fd.get("email"), name: fd.get("name"), code: fd.get("code"), redirectTo: "/" });
    } catch (e) {
      if (e instanceof AuthError) redirect("/sign-in?error=code");
      throw e;
    }
  }

  return (
    <div className="signin">
      <div className="card stack" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 30 }}>MCE</span>
          <span style={{ width: 2, height: 28, background: "var(--red)" }} />
          <span className="eyebrow">Sales Academy</span>
        </div>
        <h2>Sign in</h2>
        {entra && (
          <form action={async () => { "use server"; await signIn("microsoft-entra-id", { redirectTo: "/" }); }}>
            <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}>Sign in with Microsoft</button>
          </form>
        )}
        {accessCodeEnabled && (
          <form className="stack" action={codeSignIn}>
            {entra && <div className="small muted">Or use the team access code</div>}
            <label className="f">Your name<input name="name" required autoComplete="name" /></label>
            <label className="f">Work email<input name="email" type="email" required autoComplete="email" /></label>
            <label className="f">Team access code<input name="code" type="password" required /></label>
            {error === "code" && <div className="notice err">That email or access code didn&apos;t work. Use your work email and the code from your manager.</div>}
            <button className={`btn ${entra ? "" : "primary"}`} style={{ justifyContent: "center" }}>Sign in</button>
          </form>
        )}
        {devLoginEnabled && (
          <form className="stack" action={async (fd: FormData) => { "use server"; await signIn("dev", { email: fd.get("email"), redirectTo: "/" }); }}>
            <label className="f">Dev login (local testing only)<input name="email" type="email" required placeholder="you@company.com" /></label>
            <button className="btn">Continue</button>
          </form>
        )}
        {!entra && !accessCodeEnabled && !devLoginEnabled && (
          <div className="notice">No sign-in method is set up yet. Add ACCESS_CODE (and ALLOWED_EMAIL_DOMAINS), or the Microsoft Entra ID settings, to the environment. See the README.</div>
        )}
      </div>
    </div>
  );
}
