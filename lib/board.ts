// Board data model and the only way to change it: apply(board, op).
// Used by the API routes (real data) and by the browser in demo mode.

export type Item = { id: string; text: string; due?: string; time?: string; done?: boolean };
export type List = { id: string; title: string; color: string; items: Item[] };
export type Quiet = { on: boolean; from: string; to: string };
export type Settings = {
  calendarDays: number; showReminders: boolean; showWeather: boolean; warp: number[][] | null;
  /** false = the wall projects nothing (black) until it is switched back on. */
  power: boolean;
  /** Hours when the wall goes dark by itself, e.g. while you sleep in the same room. */
  quiet: Quiet;
};
export type SettingsPatch = Partial<Omit<Settings, "quiet">> & { quiet?: Partial<Quiet> };
export type Board = { lists: List[]; note: string; settings: Settings };

export type CalEvent = { title: string; start: string; end: string; allDay: boolean; location: string; calendar: string; color: string };
export type Reminder = { title: string; list: string; due?: string; dueHasTime?: boolean };
export type Calendar = { events: CalEvent[]; reminders: Reminder[]; calendarAccess?: boolean; remindersAccess?: boolean; syncedAt?: string };

export type Op =
  | { op: "addList"; title: string; color?: string }
  | { op: "updateList"; listId: string; title?: string; color?: string }
  | { op: "removeList"; listId: string }
  | { op: "moveList"; listId: string; dir: number }
  | { op: "addItem"; listId?: string; list?: string; text: string; due?: string; time?: string }
  | { op: "updateItem"; itemId: string; text?: string; due?: string | null; time?: string | null; done?: boolean }
  | { op: "removeItem"; itemId: string }
  | { op: "moveItem"; itemId: string; dir: number }
  | { op: "clearDone"; listId?: string }
  | { op: "setNote"; text: string }
  | { op: "setPower"; on: boolean }
  | { op: "setSettings"; patch: SettingsPatch };

// Bright enough to read as projected light on a wall.
export const COLORS = ["#0a84ff", "#ff453a", "#30d158", "#ffd60a", "#bf5af2", "#ff9f0a", "#64d2ff", "#ff375f"];

export const DEFAULT_SETTINGS: Settings = {
  calendarDays: 7, showReminders: true, showWeather: true, warp: null, power: true,
  quiet: { on: false, from: "23:30", to: "07:30" },
};

/** Boards saved before a setting existed still load: missing fields get their defaults. */
export function withDefaults(board: Board): Board {
  return {
    lists: board.lists ?? [],
    note: board.note ?? "",
    settings: { ...DEFAULT_SETTINGS, ...board.settings, quiet: { ...DEFAULT_SETTINGS.quiet, ...board.settings?.quiet } },
  };
}

export const newId = () => Math.random().toString(36).slice(2, 10);

/** The starter board a brand new wall shows. */
export function seedBoard(): Board {
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  return {
    lists: [
      { id: newId(), title: "Deadlines", color: COLORS[0], items: [{ id: newId(), text: "Hand in the report", due: inDays(6) }] },
      { id: newId(), title: "Projects", color: COLORS[1], items: ["Portfolio", "Tidy the desk", "Read the Wall README"].map((text) => ({ id: newId(), text })) },
    ],
    note: "",
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

// Hard caps, so neither a bug nor a confused Claude answer can grow the row without limit.
const MAX_LISTS = 12;
const MAX_ITEMS = 100;

const HEX = /^#[0-9a-fA-F]{6}$/;
function checkColor(c: unknown) {
  if (typeof c !== "string" || !HEX.test(c)) throw new Error("Bad colour (use #RRGGBB)");
  return c;
}
/** warp is null or 4 corners [x, y] as fractions of the screen, a little outside it at most. */
function checkWarp(w: unknown): number[][] | null {
  if (w === null) return null;
  const ok = Array.isArray(w) && w.length === 4 && w.every((p) =>
    Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && Number.isFinite(v) && v >= -0.5 && v <= 1.5));
  if (!ok) throw new Error("Bad corner positions");
  return (w as number[][]).map(([x, y]) => [x, y]);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
function checkDateTime(o: { due?: string | null; time?: string | null }) {
  for (const v of [o.due, o.time]) if (v != null && typeof v !== "string") throw new Error("Bad date or time");
  if (o.due && !DATE.test(o.due)) throw new Error(`Bad date "${o.due}" (use YYYY-MM-DD)`);
  if (o.time && !TIME.test(o.time)) throw new Error(`Bad time "${o.time}" (use HH:MM)`);
}

function findList(b: Board, ref?: string) {
  if (!ref || typeof ref !== "string") return undefined;
  return b.lists.find((l) => l.id === ref || l.title.toLowerCase() === ref.toLowerCase());
}
function findItem(b: Board, itemId: string) {
  for (const list of b.lists) {
    const index = list.items.findIndex((i) => i.id === itemId);
    if (index >= 0) return { list, index, item: list.items[index] };
  }
  throw new Error("That item no longer exists");
}
function swap<T>(arr: T[], i: number, dir: number) {
  const j = i + Math.sign(dir);
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

/** Returns a new board with the ops applied. Throws on the first invalid op (nothing is applied). */
export function applyOps(board: Board, ops: Op[]): Board {
  const b: Board = withDefaults(structuredClone(board));
  for (const op of ops) applyOne(b, op);
  return b;
}

function applyOne(b: Board, op: Op) {
  if (!op || typeof op !== "object") throw new Error("Bad change");
  switch (op.op) {
    case "addList": {
      if (b.lists.length >= MAX_LISTS) throw new Error(`The wall holds at most ${MAX_LISTS} lists`);
      const title = String(op.title ?? "").trim().slice(0, 60);
      if (!title) throw new Error("The list needs a name");
      b.lists.push({ id: newId(), title, color: op.color != null ? checkColor(op.color) : COLORS[b.lists.length % COLORS.length], items: [] });
      return;
    }
    case "updateList": {
      const l = findList(b, op.listId);
      if (!l) throw new Error("That list no longer exists");
      if (op.title !== undefined) l.title = String(op.title).trim().slice(0, 60) || l.title;
      if (op.color !== undefined) l.color = checkColor(op.color);
      return;
    }
    case "removeList":
      b.lists = b.lists.filter((l) => l.id !== op.listId);
      return;
    case "moveList":
      swap(b.lists, b.lists.findIndex((l) => l.id === op.listId), op.dir);
      return;
    case "addItem": {
      let l = findList(b, op.listId) ?? findList(b, op.list);
      if (!l && op.list) {
        applyOne(b, { op: "addList", title: op.list });
        l = b.lists[b.lists.length - 1];
      }
      if (!l) throw new Error("Pick a list for the new item");
      checkDateTime(op);
      if (l.items.length >= MAX_ITEMS) throw new Error(`“${l.title}” is full, clear some items first`);
      const text = String(op.text ?? "").trim().slice(0, 200);
      if (!text) throw new Error("The item needs some text");
      const item: Item = { id: newId(), text };
      if (op.due) item.due = op.due;
      if (op.time) item.time = op.time;
      l.items.push(item);
      return;
    }
    case "updateItem": {
      const { item } = findItem(b, op.itemId);
      checkDateTime(op);
      if (op.text !== undefined) item.text = String(op.text).trim().slice(0, 200) || item.text;
      if (op.done !== undefined) item.done = !!op.done;
      for (const k of ["due", "time"] as const) {
        if (op[k] === undefined) continue;
        if (op[k]) item[k] = op[k] as string;
        else delete item[k];
      }
      return;
    }
    case "removeItem": {
      const f = findItem(b, op.itemId);
      f.list.items.splice(f.index, 1);
      return;
    }
    case "moveItem": {
      const f = findItem(b, op.itemId);
      swap(f.list.items, f.index, op.dir);
      return;
    }
    case "clearDone":
      for (const l of b.lists) if (!op.listId || l.id === op.listId) l.items = l.items.filter((i) => !i.done);
      return;
    case "setNote":
      b.note = String(op.text ?? "").slice(0, 300);
      return;
    case "setPower":
      b.settings.power = !!op.on;
      return;
    case "setSettings": {
      const p = op.patch ?? {};
      const s = b.settings;
      if (p.calendarDays !== undefined) s.calendarDays = Math.max(1, Math.min(14, Math.round(Number(p.calendarDays)) || 7));
      if (p.showReminders !== undefined) s.showReminders = !!p.showReminders;
      if (p.showWeather !== undefined) s.showWeather = !!p.showWeather;
      if (p.warp !== undefined) s.warp = checkWarp(p.warp);
      if (p.power !== undefined) s.power = !!p.power;
      if (p.quiet !== undefined) {
        const q = p.quiet ?? {};
        for (const k of ["from", "to"] as const) {
          if (q[k] === undefined) continue;
          if (typeof q[k] !== "string" || !TIME.test(q[k]!)) throw new Error("Bad time (use HH:MM)");
          s.quiet[k] = q[k]!;
        }
        if (q.on !== undefined) s.quiet.on = !!q.on;
      }
      return;
    }
    default:
      throw new Error(`Unknown change "${(op as { op: string }).op}"`);
  }
}
