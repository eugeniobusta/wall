"use client";
// What the projector shows, drawn on a fixed 720x1280 portrait canvas. The projector page scales
// and warps it to the window; the editor preview and the landing page scale it into a frame.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Board, Calendar, CalEvent } from "@/lib/board";
import { PLACE, TIMEZONE } from "@/lib/config";
import { dayLabel, daysUntil, dueLabel, hhmm, untilLabel, urgency, ymd } from "@/lib/time";

export const WALL_W = 720, WALL_H = 1280;

export function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

// Weather from Open-Meteo (free, no key).
export type Weather = { temp: number; sky: string; rain: string | null };
const SKY: [number, string][] = [[0, "Clear"], [3, "Cloudy"], [48, "Fog"], [57, "Drizzle"], [67, "Rain"], [77, "Snow"], [82, "Showers"], [86, "Snow showers"], [99, "Thunder"]];
export function useWeather(enabled: boolean) {
  const [wx, setWx] = useState<Weather | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const load = async () => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lon}&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_hours=12&timezone=${encodeURIComponent(TIMEZONE)}`);
        const j = await r.json();
        const code: number = j.current.weather_code;
        const probs: number[] = j.hourly.precipitation_probability;
        const i = probs.findIndex((p) => p >= 50);
        setWx({
          temp: Math.round(j.current.temperature_2m),
          sky: SKY.find(([max]) => code <= max)?.[1] ?? "",
          rain: i < 0 ? null : i === 0 ? "Rain likely now" : `Rain likely ${j.hourly.time[i].slice(11, 16)}`,
        });
      } catch { /* offline: keep the last reading */ }
    };
    load();
    const t = setInterval(load, 20 * 60_000);
    return () => clearInterval(t);
  }, [enabled]);
  return enabled ? wx : null;
}

function Chip({ date }: { date: string }) {
  return <span className={`chip ${urgency(date)}`}>{dueLabel(date)}</span>;
}

function NextUp({ events }: { events: CalEvent[] }) {
  const now = Date.now();
  const e = events.find((ev) => !ev.allDay && new Date(ev.end).getTime() > now);
  if (!e) return null;
  const start = new Date(e.start);
  return (
    <div className="next">
      <div className="label">Next · {untilLabel(start)}</div>
      <div className="title">{e.title}</div>
      <div className="meta">{hhmm(start)} to {hhmm(new Date(e.end))}{e.location ? ` · ${e.location}` : ""}</div>
    </div>
  );
}

function Agenda({ cal, board }: { cal: Calendar; board: Board }) {
  const days = new Map<string, { d: Date; items: CalEvent[] }>();
  for (const ev of cal.events) {
    // The agent sends UTC instants; read them in local time so an all-day event that starts at
    // local midnight in summer (23:00Z the day before) still lands on the right day.
    let d = new Date(ev.start);
    if (new Date(ev.end).getTime() < Date.now()) continue;
    if (ev.allDay && daysUntil(ymd(d)) < 0) d = new Date(); // multi-day event already running: show it today
    const key = ymd(d);
    const n = daysUntil(key);
    if (n < 0 || n >= board.settings.calendarDays) continue;
    if (!days.has(key)) days.set(key, { d, items: [] });
    days.get(key)!.items.push(ev);
  }
  const reminders = board.settings.showReminders
    ? [...cal.reminders].sort((a, b) => (a.due ?? "9") < (b.due ?? "9") ? -1 : 1).slice(0, 5)
    : [];
  if (!days.size && !reminders.length) return null;
  return (
    <section>
      {[...days.entries()].slice(0, 5).map(([key, { d, items }]) => (
        <div key={key}>
          <div className="day">{dayLabel(d)}</div>
          {items.slice(0, 4).map((ev, i) => (
            <div className="row" key={i}>
              <span className="t">{ev.allDay ? "all day" : hhmm(new Date(ev.start))}</span>
              <span className="dot" style={{ background: ev.color || "#888" }} />
              <span className="txt">{ev.title}</span>
            </div>
          ))}
          {items.length > 4 && <div className="row sub"><span className="t" /><span className="txt">and {items.length - 4} more</span></div>}
        </div>
      ))}
      {reminders.length > 0 && (
        <>
          <div className="day">Reminders</div>
          {reminders.map((r, i) => (
            <div className="row" key={i}>
              <span className="txt">{r.title}</span>
              {r.due && <Chip date={ymd(new Date(r.due))} />}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function Lists({ board }: { board: Board }) {
  return (
    <section className={`lists ${board.lists.length > 1 ? "" : "single"}`}>
      {board.lists.map((l) => {
        const items = [...l.items].sort((a, b) => Number(!!a.done) - Number(!!b.done));
        return (
          <div className="list" key={l.id} style={{ "--accent": l.color } as React.CSSProperties}>
            <h2 style={{ color: l.color }}>{l.title}</h2>
            {items.slice(0, 8).map((i) => (
              <div className={`row ${i.done ? "done" : ""}`} key={i.id}>
                <span className="txt">{i.text}{i.time && <span className="sub"> {i.time}</span>}</span>
                {i.due && !i.done && <Chip date={i.due} />}
              </div>
            ))}
            {items.length > 8 && <div className="row sub">and {items.length - 8} more</div>}
          </div>
        );
      })}
    </section>
  );
}

/** The canvas itself. `flash` pulses it briefly whenever the lists or the note change. */
export default function WallCanvas({ board, calendar, now, wx, style, flash = true }: {
  board: Board | null; calendar: Calendar | null; now: Date; wx: Weather | null; style?: React.CSSProperties; flash?: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const sig = useMemo(() => (board ? JSON.stringify(board.lists) + board.note : ""), [board]);
  const prevSig = useRef("");
  useEffect(() => {
    const el = stage.current;
    if (flash && el && prevSig.current && sig !== prevSig.current) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
    prevSig.current = sig;
  }, [sig, flash]);

  const synced = calendar?.syncedAt ? (Date.now() - new Date(calendar.syncedAt).getTime()) / 60000 : null;
  return (
    <div className="stage" ref={stage} style={style}>
      <div className="top">
        <div>
          <div className="time">{hhmm(now)}</div>
          <div className="date">{now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        {wx && (
          <div className="wx">
            <div className="temp">{wx.temp}°</div>
            <div className="sky">{wx.sky}</div>
            {wx.rain && <div className="rain">{wx.rain}</div>}
          </div>
        )}
      </div>
      {calendar && <NextUp events={calendar.events} />}
      {calendar && board && <Agenda cal={calendar} board={board} />}
      {board && <Lists board={board} />}
      {board?.note && <div className="note">{board.note}</div>}
      {synced !== null && synced > 30 && <div className="stale">Calendar last synced {Math.round(synced / 60) || 1}h ago. Is the Mac on?</div>}
    </div>
  );
}

/** The canvas scaled to fit the width of whatever contains it (editor preview, landing page). */
export function WallFrame(props: Omit<Parameters<typeof WallCanvas>[0], "style"> & { className?: string; children?: React.ReactNode }) {
  const { className, children, ...rest } = props;
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / WALL_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={`wall-frame ${className ?? ""}`} ref={box}>
      {scale > 0 && <WallCanvas {...rest} style={{ transform: `scale(${scale})` }} />}
      {children}
    </div>
  );
}
