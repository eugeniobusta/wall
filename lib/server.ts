// Server-only helpers for the API routes: who is calling, and read/write the board.
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyOps, seedBoard, type Board, type Calendar, type Op } from "./board";

let admin: SupabaseClient | null = null;
function db() {
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return admin;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Constant-time string comparison, so response timing says nothing about the token. */
function sameSecret(a: string, b: string) {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

/** Accepts a signed-in Supabase session for ALLOWED_EMAIL, or the Siri shortcut token. */
export async function authorize(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) throw new HttpError(401, "Not signed in");
  const shortcut = process.env.WALL_API_TOKEN;
  if (shortcut && shortcut.length >= 32 && sameSecret(token, shortcut)) return;
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed) throw new HttpError(500, "ALLOWED_EMAIL is not set");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expired, sign in again");
  if (!data.user.email || !data.user.email_confirmed_at || data.user.email.toLowerCase() !== allowed) throw new HttpError(403, "This account can't edit the wall");
}

async function readBoard(): Promise<{ board: Board; updatedAt: string }> {
  const { data, error } = await db().from("board").select("data, updated_at").eq("id", 1).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (data) return { board: data.data as Board, updatedAt: data.updated_at };
  // First run: store the starter board so every client sees the same item ids.
  const seeded = await db().from("board").upsert({ id: 1, data: seedBoard() }, { onConflict: "id", ignoreDuplicates: true });
  if (seeded.error) throw new HttpError(500, seeded.error.message);
  return readBoard();
}

export async function readCalendar(): Promise<Calendar | null> {
  const { data } = await db().from("calendar_snapshot").select("data").eq("id", 1).maybeSingle();
  return (data?.data as Calendar) ?? null;
}

export async function getBoard() {
  return (await readBoard()).board;
}

/**
 * Applies ops with optimistic concurrency: the write only lands if nobody saved in between,
 * otherwise it re-reads and retries. Invalid ops throw before anything is written.
 */
export async function changeBoard(makeOps: (board: Board) => Op[] | Promise<Op[]>) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { board, updatedAt } = await readBoard();
    const ops = await makeOps(board);
    let next: Board;
    try { next = applyOps(board, ops); } catch (e) { throw new HttpError(400, (e as Error).message); }
    if (!ops.length) return board;
    const { data, error } = await db().from("board").update({ data: next, updated_at: new Date().toISOString() })
      .eq("id", 1).eq("updated_at", updatedAt).select("id");
    if (error) throw new HttpError(500, error.message);
    if (data?.length) return next;
  }
  throw new HttpError(409, "The board changed at the same time, try again");
}

/** Parses the JSON body; anything unreadable is the caller's mistake, not a server error. */
export async function readJson<T>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") return body as T;
  } catch {}
  throw new HttpError(400, "Bad request");
}

export function errorResponse(e: unknown) {
  const status = e instanceof HttpError ? e.status : 500;
  // Unexpected failures are logged in full but answered generically, so internals never leak.
  if (status >= 500) console.error(e);
  const message = e instanceof HttpError ? e.message : "Something went wrong";
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}
