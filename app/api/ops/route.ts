import { authorize, changeBoard, errorResponse, readJson } from "@/lib/server";
import type { Op } from "@/lib/board";

export async function POST(req: Request) {
  try {
    await authorize(req);
    const { ops } = await readJson<{ ops: Op[] }>(req);
    if (!Array.isArray(ops) || ops.length > 100) return Response.json({ error: "Bad request" }, { status: 400 });
    await changeBoard(() => ops);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
