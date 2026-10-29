import { currentUser } from "@/lib/session";

/**
 * Gives the browser what it needs to start a voice call.
 * With ELEVENLABS_API_KEY set, returns a short-lived signed URL, so the agent can
 * require authentication and nobody can use your minutes from outside the app.
 */
export async function GET(req: Request) {
  if (!(await currentUser())) return Response.json({ error: "Not signed in" }, { status: 401 });
  // The MCE Sales Academy practice-customer agent. Override with ELEVENLABS_AGENT_ID to use a different one.
  // ?agent=expert uses the Flow Mind AI agent instead (override with ELEVENLABS_EXPERT_AGENT_ID).
  const expert = new URL(req.url).searchParams.get("agent") === "expert";
  const agentId = expert
    ? process.env.ELEVENLABS_EXPERT_AGENT_ID || "agent_0901m63nj86nfbasdkmpfpzdhntf"
    : process.env.ELEVENLABS_AGENT_ID || "agent_9401m5wj7gdrfbzvrxvt8pjf939w";
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ agentId });
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": key },
    cache: "no-store",
  });
  if (!r.ok) return Response.json({ error: `ElevenLabs returned ${r.status}` }, { status: 502 });
  const { signed_url } = (await r.json()) as { signed_url: string };
  return Response.json({ signedUrl: signed_url });
}
