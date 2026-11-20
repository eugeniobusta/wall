// Date helpers. All "today" logic uses the device's local time (the wall and phone are in Dublin).
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Whole days from today to a YYYY-MM-DD date. */
export function daysUntil(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(new Date()).getTime()) / DAY);
}

export function dueLabel(date: string) {
  const n = daysUntil(date);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n}d` : `${-n}d ago`;
}

/** "hot" when due/overdue within a day, "soon" within 3 days. */
export function urgency(date: string): "hot" | "soon" | "" {
  const n = daysUntil(date);
  return n <= 1 ? "hot" : n <= 3 ? "soon" : "";
}

export function dayLabel(d: Date) {
  const n = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / DAY);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
}

/** True while the clock is inside the quiet window; the window may cross midnight. */
export function isQuiet(now: Date, q: { on: boolean; from: string; to: string }) {
  if (!q.on) return false;
  const mins = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const t = now.getHours() * 60 + now.getMinutes(), from = mins(q.from), to = mins(q.to);
  return from <= to ? t >= from && t < to : t >= from || t < to;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function agoLabel(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

export const hhmm = (d: Date) => d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });

export function untilLabel(start: Date) {
  const mins = Math.round((start.getTime() - Date.now()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${dayLabel(start)} ${hhmm(start)}`;
}
