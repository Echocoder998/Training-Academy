import { currentUser } from "@/lib/session";

/**
 * Gives the browser what it needs to start a voice call.
 * With ELEVENLABS_API_KEY set, returns a short-lived signed URL, so the agent can
 * require authentication and nobody can use your minutes from outside the app.
 */
export async function GET() {
  if (!(await currentUser())) return Response.json({ error: "Not signed in" }, { status: 401 });
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) return Response.json({ error: "ELEVENLABS_AGENT_ID is not set" }, { status: 503 });
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
