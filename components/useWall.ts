"use client";
// One hook for both pages: sign-in state, the live board + calendar, and actions.
// Real mode = Supabase (login, realtime). Demo mode (no Supabase env) = data in this browser only.
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { applyOps, withDefaults, type Board, type Calendar, type Op } from "@/lib/board";
import { demoBoard, demoCalendar } from "@/lib/demo";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const DEMO = !URL_ || !ANON;

let client: SupabaseClient | null = null;
export function supabase() {
  client ??= createClient(URL_!, ANON!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

// ---------- demo data ----------
const DEMO_KEY = "wall-demo-board-v2";
function readDemo(): Board {
  try { const s = localStorage.getItem(DEMO_KEY); if (s) return withDefaults(JSON.parse(s)); } catch {}
  return demoBoard();
}

export type WallState = {
  ready: boolean;
  session: Session | null;
  board: Board | null;
  calendar: Calendar | null;
  live: boolean;
  send: (ops: Op[]) => Promise<void>;
  command: (text: string) => Promise<string>;
};

export function useWall(): WallState {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [board, setBoardRaw] = useState<Board | null>(null);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [live, setLive] = useState(false);
  const boardRef = useRef<Board | null>(null);
  boardRef.current = board;
  const setBoard = useCallback((b: Board) => setBoardRaw(withDefaults(b)), []);

  // ---------- demo mode ----------
  useEffect(() => {
    if (!DEMO) return;
    setBoard(readDemo());
    setCalendar(demoCalendar());
    setLive(true);
    setReady(true);
    const ch = new BroadcastChannel("wall-demo"); // keeps a /wall tab and an /edit tab in sync
    ch.onmessage = (e) => setBoard(e.data);
    return () => ch.close();
  }, [setBoard]);

  // ---------- real mode: session ----------
  useEffect(() => {
    if (DEMO) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const api = useCallback(async (path: string, body: unknown) => {
    const token = (await supabase().auth.getSession()).data.session?.access_token;
    let r: Response;
    try {
      r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    } catch {
      throw new Error("Can't reach the wall. Check your connection and try again.");
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`);
    return j;
  }, []);

  // ---------- real mode: data + realtime ----------
  const userId = session?.user.id;
  useEffect(() => {
    if (DEMO || !userId) return;
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const [b, c] = await Promise.all([
        sb.from("board").select("data").eq("id", 1).maybeSingle(),
        sb.from("calendar_snapshot").select("data").eq("id", 1).maybeSingle(),
      ]);
      if (cancelled) return;
      if (b.data) setBoard(b.data.data as Board);
      else if (!b.error) { await api("/api/ops", { ops: [] }).catch(() => {}); if (!cancelled) load(); return; } // first run seeds the board
      if (c.data) setCalendar(c.data.data as Calendar);
    };
    load();

    const channel = sb.channel("wall")
      .on("postgres_changes", { event: "*", schema: "public", table: "board" }, (p) => { const row = p.new as { data?: Board }; if (row?.data) setBoard(row.data); })
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_snapshot" }, (p) => { const row = p.new as { data?: Calendar }; if (row?.data) setCalendar(row.data); })
      .subscribe((status) => { setLive(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") load(); });

    // Phones suspend sockets in the background; refresh when the page comes back.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; sb.removeChannel(channel); document.removeEventListener("visibilitychange", onVisible); };
  }, [userId, api, setBoard]);

  const send = useCallback(async (ops: Op[]) => {
    const current = boardRef.current;
    if (!current) return;
    const next = applyOps(current, ops); // throws on invalid input before anything is sent
    setBoard(next); // optimistic: the UI updates instantly
    if (DEMO) {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)); } catch {}
      const ch = new BroadcastChannel("wall-demo"); ch.postMessage(next); ch.close();
      return;
    }
    try { await api("/api/ops", { ops }); }
    catch (e) {
      const { data } = await supabase().from("board").select("data").eq("id", 1).maybeSingle();
      if (data) setBoard(data.data as Board);
      throw e;
    }
  }, [api, setBoard]);

  const command = useCallback(async (text: string) => {
    if (DEMO) return "This is the demo. On a real wall Claude turns that sentence into changes. Try editing the lists by hand.";
    const r = await api("/api/command", { text });
    return r.reply as string;
  }, [api]);

  return { ready, session, board, calendar, live, send, command };
}
