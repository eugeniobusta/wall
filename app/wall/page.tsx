"use client";
// The projector page: the wall canvas scaled to the window, with an optional 4-corner warp.
import { useEffect, useState } from "react";
import { useWall, DEMO } from "@/components/useWall";
import Login from "@/components/Login";
import WallCanvas, { useNow, useWeather, WALL_H, WALL_W } from "@/components/WallCanvas";
import { isQuiet } from "@/lib/time";
import { warpTransform } from "@/lib/warp";

function useWindowSize() {
  const [size, setSize] = useState({ w: WALL_W, h: WALL_H });
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

/** A wall can stay open for weeks: reload it when a new build is deployed. */
function useAutoReload() {
  useEffect(() => {
    let first: string | null = null;
    const check = async () => {
      try {
        const { version } = await (await fetch("/api/version", { cache: "no-store" })).json();
        if (first === null) first = version;
        else if (version !== first) location.reload();
      } catch { /* offline: try again next time */ }
    };
    check();
    const t = setInterval(check, 10 * 60_000);
    return () => clearInterval(t);
  }, []);
}

/** Ask the browser to keep the screen on while the wall is showing. */
function useWakeLock() {
  useEffect(() => {
    type Lock = { release(): Promise<void> };
    const wl = (navigator as unknown as { wakeLock?: { request(t: "screen"): Promise<Lock> } }).wakeLock;
    if (!wl) return;
    let lock: Lock | null = null;
    const acquire = () => { if (document.visibilityState === "visible") wl.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => { document.removeEventListener("visibilitychange", acquire); lock?.release().catch(() => {}); };
  }, []);
}

export default function WallPage() {
  const { ready, session, board, calendar } = useWall();
  const now = useNow(10_000);
  const { w, h } = useWindowSize();
  const wx = useWeather(!!board?.settings.showWeather);
  useAutoReload();
  useWakeLock();

  if (!ready) return <div className="wall-root" />;
  if (!DEMO && !session) return <Login />;

  // Black is "no light" on a projector, so an off or quiet wall simply projects nothing.
  const dark = !!board && (!board.settings.power || isQuiet(now, board.settings.quiet));
  const warp = board?.settings.warp;
  const s = Math.min(w / WALL_W, h / WALL_H);
  const transform = warp ? warpTransform(warp, w, h, WALL_W, WALL_H) : `translate(${(w - WALL_W * s) / 2}px, ${(h - WALL_H * s) / 2}px) scale(${s})`;

  return (
    <div className={`wall-root ${dark ? "dark" : ""}`}>
      <WallCanvas board={board} calendar={calendar} now={now} wx={wx} style={{ transform }} />
    </div>
  );
}
