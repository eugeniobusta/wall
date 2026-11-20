// The deployed build's id. The wall page polls this and reloads itself after a new deploy,
// so a projector that stays on for weeks never runs stale code.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
