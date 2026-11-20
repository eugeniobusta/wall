"use client";
// The app: phone first. Three tabs (Lists, Wall, Settings) under a floating glass bar,
// with an Ask field that sends a plain sentence to Claude.
import { useEffect, useRef, useState } from "react";
import { useWall, DEMO, supabase } from "@/components/useWall";
import Login from "@/components/Login";
import Icon, { type IconName } from "@/components/Icon";
import { WallFrame, useNow, useWeather } from "@/components/WallCanvas";
import { COLORS, type Board, type Calendar, type Item, type List, type Op } from "@/lib/board";
import { SITE } from "@/lib/config";
import { agoLabel, dueLabel, isQuiet, urgency, ymd } from "@/lib/time";

type Send = (ops: Op[]) => Promise<void>;
type Tab = "lists" | "wall" | "settings";
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "lists", label: "Lists", icon: "list" },
  { id: "wall", label: "Wall", icon: "wall" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

// ---------------- building blocks ----------------
function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)} />;
}

/** A bottom sheet. Close it with the round button, the backdrop, Escape, or by pulling the grabber down. */
function Sheet({ title, onClose, onDone, children }: { title: string; onClose: () => void; onDone?: () => void; children: React.ReactNode }) {
  const [closing, setClosing] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const close = (then: () => void) => { setClosing(true); setTimeout(then, 260); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(onClose);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`backdrop ${closing ? "closing" : ""}`} onClick={() => close(onClose)}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={pull ? { transform: `translateY(${pull}px)`, transition: "none" } : undefined}>
        <div className="grabber-zone"
          onPointerDown={(e) => { startY.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => startY.current !== null && setPull(Math.max(0, e.clientY - startY.current))}
          onPointerUp={() => { if (pull > 90) close(onClose); setPull(0); startY.current = null; }}
          onPointerCancel={() => { setPull(0); startY.current = null; }}>
          <div className="grabber" />
        </div>
        <div className="sheet-head">
          <button type="button" className="round" aria-label="Close" onClick={() => close(onClose)}><Icon name="close" size={18} weight={2.4} /></button>
          <h3>{title}</h3>
          {onDone ? <button type="button" className="round tint" aria-label="Done" onClick={() => close(onDone)}><Icon name="check" size={18} weight={2.6} /></button> : <span className="round ghost" />}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------- item sheet ----------------
function nextWeekday(target: number) { const d = new Date(); d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7)); return ymd(d); }
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }

function ItemSheet({ item, list, board, send, onClose }: { item: Item; list: List; board: Board; send: Send; onClose: () => void }) {
  const [text, setText] = useState(item.text);
  const [due, setDue] = useState(item.due ?? "");
  const [time, setTime] = useState(item.time ?? "");
  const [listId, setListId] = useState(list.id);
  const save = () => {
    const ops: Op[] = [];
    if (!text.trim()) ops.push({ op: "removeItem", itemId: item.id });
    else if (listId !== list.id) ops.push({ op: "removeItem", itemId: item.id }, { op: "addItem", listId, text: text.trim(), due, time });
    else ops.push({ op: "updateItem", itemId: item.id, text: text.trim(), due, time: due ? time : "" });
    onClose();
    send(ops);
  };
  const act = (ops: Op[]) => { onClose(); send(ops); };
  const quick: [string, string][] = [["Today", plusDays(0)], ["Tomorrow", plusDays(1)], ["Friday", nextWeekday(5)], ["Next week", plusDays(7)]];
  return (
    <Sheet title="Details" onClose={onClose} onDone={save}>
      <div className="cells">
        <div className="cell"><input className="plain big" value={text} placeholder="Title" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Title" /></div>
      </div>

      <div className="chips">
        {quick.map(([label, d]) => <button type="button" key={label} className={`chipbtn ${due === d ? "on" : ""}`} onClick={() => setDue(due === d ? "" : d)}>{label}</button>)}
      </div>
      <div className="cells">
        <label className="cell"><span className="cell-icon" style={{ background: "var(--red)" }}><Icon name="calendar" size={17} /></span><span className="grow">Date</span>
          <input className="picker" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        {due && (
          <label className="cell"><span className="cell-icon" style={{ background: "var(--blue)" }}><Icon name="bolt" size={17} /></span><span className="grow">Time</span>
            <input className="picker" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        )}
        {due && <button type="button" className="cell link" onClick={() => { setDue(""); setTime(""); }}>Remove date</button>}
      </div>

      {board.lists.length > 1 && (
        <>
          <div className="cells-title">List</div>
          <div className="chips">
            {board.lists.map((l) => (
              <button type="button" key={l.id} className={`chipbtn ${l.id === listId ? "on" : ""}`} style={{ "--accent": l.color } as React.CSSProperties} onClick={() => setListId(l.id)}>
                <span className="swatch-dot" />{l.title}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="cells">
        <button type="button" className="cell link" onClick={() => act([{ op: "moveItem", itemId: item.id, dir: -1 }])}>Move up</button>
        <button type="button" className="cell link" onClick={() => act([{ op: "moveItem", itemId: item.id, dir: 1 }])}>Move down</button>
        <button type="button" className="cell link danger" onClick={() => act([{ op: "removeItem", itemId: item.id }])}>Delete item</button>
      </div>
    </Sheet>
  );
}

// ---------------- list sheet (new list, or edit one) ----------------
function ListSheet({ list, board, send, onClose }: { list: List | null; board: Board; send: Send; onClose: () => void }) {
  const [title, setTitle] = useState(list?.title ?? "");
  const [color, setColor] = useState(list?.color ?? COLORS[board.lists.length % COLORS.length]);
  const [confirming, setConfirming] = useState(false);
  const index = list ? board.lists.findIndex((l) => l.id === list.id) : -1;
  const done = list?.items.filter((i) => i.done).length ?? 0;
  const save = () => {
    onClose();
    if (!title.trim()) return;
    if (!list) send([{ op: "addList", title: title.trim(), color }]);
    else if (title.trim() !== list.title || color !== list.color) send([{ op: "updateList", listId: list.id, title: title.trim(), color }]);
  };
  const act = (ops: Op[]) => { onClose(); send(ops); };
  return (
    <Sheet title={list ? "List" : "New List"} onClose={onClose} onDone={save}>
      <div className="cells">
        <div className="cell"><input className="plain big" style={{ color }} value={title} placeholder="List name" autoFocus={!list}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="List name" /></div>
      </div>
      <div className="cells">
        <div className="cell swatches">
          {COLORS.map((c) => <button type="button" key={c} className={`swatch ${c === color ? "on" : ""}`} style={{ "--accent": c } as React.CSSProperties} aria-label={`Colour ${c}`} onClick={() => setColor(c)} />)}
        </div>
      </div>
      {list && (
        <div className="cells">
          {index > 0 && <button type="button" className="cell link" onClick={() => act([{ op: "moveList", listId: list.id, dir: -1 }])}>Move up</button>}
          {index < board.lists.length - 1 && <button type="button" className="cell link" onClick={() => act([{ op: "moveList", listId: list.id, dir: 1 }])}>Move down</button>}
          {done > 0 && <button type="button" className="cell link" onClick={() => act([{ op: "clearDone", listId: list.id }])}>Clear {done} completed</button>}
          {!confirming
            ? <button type="button" className="cell link danger" onClick={() => setConfirming(true)}>Delete list</button>
            : <button type="button" className="cell link danger strong" onClick={() => act([{ op: "removeList", listId: list.id }])}>Tap again to delete {list.items.length ? `all ${list.items.length} items` : "this list"}</button>}
        </div>
      )}
    </Sheet>
  );
}

// ---------------- lists tab ----------------
function ListGroup({ list, send, onOpen, onEdit }: { list: List; send: Send; onOpen: (i: Item) => void; onEdit: () => void }) {
  const [draft, setDraft] = useState("");
  const left = list.items.filter((i) => !i.done).length;
  return (
    <section className="group" style={{ "--accent": list.color } as React.CSSProperties}>
      <div className="group-head">
        <h2>{list.title}</h2>
        <span className="count">{left}</span>
        <button type="button" className="round small" aria-label={`Edit the list ${list.title}`} onClick={onEdit}><Icon name="more" size={18} /></button>
      </div>
      <div className="cells">
        {list.items.map((i) => (
          <div className={`cell item ${i.done ? "done" : ""}`} key={i.id}>
            <button type="button" className={`check ${i.done ? "on" : ""}`} aria-label={i.done ? `Mark ${i.text} as not done` : `Mark ${i.text} as done`}
              onClick={() => send([{ op: "updateItem", itemId: i.id, done: !i.done }])}>
              <Icon name="check" size={14} weight={3.2} />
            </button>
            <button type="button" className="item-body" onClick={() => onOpen(i)}>
              <span className="text">{i.text}</span>
              {i.due && <span className={`when ${i.done ? "" : urgency(i.due)}`}>{dueLabel(i.due)}{i.time ? ` at ${i.time}` : ""}</span>}
            </button>
          </div>
        ))}
        <form className="cell item add" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) send([{ op: "addItem", listId: list.id, text: draft.trim() }]); setDraft(""); }}>
          <span className="check plus"><Icon name="plus" size={14} weight={3} /></span>
          <input className="plain" placeholder="New item" value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="done" aria-label={`New item in ${list.title}`} />
        </form>
      </div>
    </section>
  );
}

function NoteGroup({ note, send }: { note: string; send: Send }) {
  const [v, setV] = useState(note);
  useEffect(() => setV(note), [note]);
  return (
    <section className="group">
      <div className="cells-title">Note on the wall</div>
      <div className="cells">
        <div className="cell"><textarea className="plain" rows={2} value={v} placeholder="One line, written big at the bottom" onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== note && send([{ op: "setNote", text: v }])} aria-label="Note on the wall" /></div>
      </div>
    </section>
  );
}

// ---------------- wall tab ----------------
function WallTab({ board, calendar, send }: { board: Board; calendar: Calendar | null; send: Send }) {
  const now = useNow(10_000);
  const wx = useWeather(board.settings.showWeather);
  const s = board.settings;
  const quiet = isQuiet(now, s.quiet);
  const dark = !s.power || quiet;
  return (
    <>
      <WallFrame className={dark ? "dimmed" : ""} board={board} calendar={calendar} now={now} wx={wx}>
        {dark && <div className="frame-badge"><Icon name={s.power ? "moon" : "power"} size={16} />{s.power ? `Quiet until ${s.quiet.to}` : "The wall is off"}</div>}
      </WallFrame>
      <div className="cells-foot center">{dark ? "The projector shows black right now. This is what comes back." : "This is what the projector shows right now."}</div>
      <div className="cells">
        <div className="cell"><span className="cell-icon" style={{ background: "var(--green)" }}><Icon name="power" size={17} /></span><span className="grow">Wall</span>
          <Switch on={s.power} label="Wall on" onChange={(on) => send([{ op: "setPower", on }])} />
        </div>
      </div>
    </>
  );
}

// ---------------- corner pin ----------------
const SQUARE = [[0, 0], [1, 0], [1, 1], [0, 1]];
function CornerPin({ warp, send }: { warp: number[][] | null; send: Send }) {
  const pad = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState<number[][] | null>(warp);
  const drag = useRef(-1);
  const last = useRef(0);
  useEffect(() => { if (drag.current < 0) setPts(warp); }, [warp]);
  const move = (e: React.PointerEvent) => {
    if (drag.current < 0 || !pts || !pad.current) return;
    const r = pad.current.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-0.25, Math.min(1.25, v));
    const next = pts.map((p, i) => (i === drag.current ? [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)] : p));
    setPts(next);
    if (Date.now() - last.current > 100) { last.current = Date.now(); send([{ op: "setSettings", patch: { warp: next } }]).catch(() => {}); }
  };
  const end = () => { if (drag.current >= 0 && pts) send([{ op: "setSettings", patch: { warp: pts } }]).catch(() => {}); drag.current = -1; };
  const shown = pts ?? SQUARE;
  return (
    <div className="pin">
      <div className="pad" ref={pad} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <svg viewBox="0 0 90 160" preserveAspectRatio="none"><polygon points={shown.map(([x, y]) => `${x * 90},${y * 160}`).join(" ")} /></svg>
        {pts && pts.map(([x, y], i) => (
          <div key={i} className="handle" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            onPointerDown={(e) => { drag.current = i; (e.target as HTMLElement).setPointerCapture(e.pointerId); }} />
        ))}
      </div>
      {!pts
        ? <button type="button" className="capsule" onClick={() => { setPts(SQUARE); send([{ op: "setSettings", patch: { warp: SQUARE } }]); }}>Adjust corners</button>
        : <button type="button" className="capsule" onClick={() => { setPts(null); send([{ op: "setSettings", patch: { warp: null } }]); }}>Reset to full screen</button>}
    </div>
  );
}

// ---------------- settings tab ----------------
function SettingsTab({ board, calendar, email, send }: { board: Board; calendar: Calendar | null; email?: string; send: Send }) {
  const s = board.settings;
  const set = (patch: Extract<Op, { op: "setSettings" }>["patch"]) => send([{ op: "setSettings", patch }]);
  useNow(30_000); // keeps "synced 2 min ago" fresh
  return (
    <>
      <div className="cells-title">On the wall</div>
      <div className="cells">
        <div className="cell"><span className="cell-icon" style={{ background: "var(--red)" }}><Icon name="calendar" size={17} /></span><span className="grow">Calendar days</span>
          <span className="stepper">
            <button type="button" aria-label="Fewer days" disabled={s.calendarDays <= 1} onClick={() => set({ calendarDays: s.calendarDays - 1 })}>−</button>
            <b>{s.calendarDays}</b>
            <button type="button" aria-label="More days" disabled={s.calendarDays >= 14} onClick={() => set({ calendarDays: s.calendarDays + 1 })}>+</button>
          </span>
        </div>
        <div className="cell"><span className="cell-icon" style={{ background: "var(--orange)" }}><Icon name="list" size={17} /></span><span className="grow">Apple Reminders</span>
          <Switch on={s.showReminders} label="Show Apple Reminders" onChange={(v) => set({ showReminders: v })} /></div>
        <div className="cell"><span className="cell-icon" style={{ background: "var(--blue)" }}><Icon name="cloud" size={17} /></span><span className="grow">Weather</span>
          <Switch on={s.showWeather} label="Show weather" onChange={(v) => set({ showWeather: v })} /></div>
      </div>

      <div className="cells-title">Quiet hours</div>
      <div className="cells">
        <div className="cell"><span className="cell-icon" style={{ background: "var(--indigo)" }}><Icon name="moon" size={17} /></span><span className="grow">Scheduled</span>
          <Switch on={s.quiet.on} label="Quiet hours" onChange={(on) => set({ quiet: { on } })} /></div>
        {s.quiet.on && (
          <>
            <label className="cell"><span className="grow">From</span><input className="picker" type="time" value={s.quiet.from} onChange={(e) => e.target.value && set({ quiet: { from: e.target.value } })} /></label>
            <label className="cell"><span className="grow">To</span><input className="picker" type="time" value={s.quiet.to} onChange={(e) => e.target.value && set({ quiet: { to: e.target.value } })} /></label>
          </>
        )}
      </div>
      <div className="cells-foot">The wall goes dark by itself between these times, so it never lights the room while you sleep.</div>

      <div className="cells-title">Alignment</div>
      <div className="cells"><div className="cell block"><CornerPin warp={s.warp} send={send} /></div></div>
      <div className="cells-foot">Drag each corner until the projected image sits square on your whiteboard. The wall follows as you drag.</div>

      <div className="cells-title">Calendar sync</div>
      <div className="cells">
        <div className="cell"><span className="grow">Last synced</span><span className="value">{calendar?.syncedAt ? agoLabel(calendar.syncedAt) : "Never"}</span></div>
        <div className="cell"><span className="grow">Calendar</span><span className="value">{calendar ? (calendar.calendarAccess === false ? "No access" : `${calendar.events.length} events`) : "Waiting"}</span></div>
        <div className="cell"><span className="grow">Reminders</span><span className="value">{calendar ? (calendar.remindersAccess === false ? "No access" : `${calendar.reminders.length} open`) : "Waiting"}</span></div>
      </div>
      <div className="cells-foot">Wall Agent on your Mac reads Apple Calendar and Reminders and uploads them every five minutes while the Mac is awake.</div>

      {!DEMO && (
        <>
          <div className="cells-title">Account</div>
          <div className="cells">
            {email && <div className="cell"><span className="grow">Signed in</span><span className="value">{email}</span></div>}
            <button type="button" className="cell link danger" onClick={() => supabase().auth.signOut()}>Sign Out</button>
          </div>
        </>
      )}

      <div className="cells-title">About</div>
      <div className="cells">
        <a className="cell" href={SITE.repo} target="_blank" rel="noreferrer"><span className="cell-icon" style={{ background: "#3a3a3c" }}><Icon name="github" size={17} /></span><span className="grow">Source on GitHub</span><span className="chev"><Icon name="chevron" size={15} weight={2.4} /></span></a>
        <a className="cell" href="/?about" ><span className="cell-icon" style={{ background: "var(--purple)" }}><Icon name="sparkle" size={17} /></span><span className="grow">About Wall</span><span className="chev"><Icon name="chevron" size={15} weight={2.4} /></span></a>
      </div>
    </>
  );
}

// ---------------- the floating bar: tabs + Ask ----------------
type SR = { start(): void; stop(): void; lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void };

/** Lifts the bar above the on-screen keyboard (fixed elements otherwise hide behind it on iOS). */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => document.documentElement.style.setProperty("--kb", `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
    on(); vv.addEventListener("resize", on); vv.addEventListener("scroll", on);
    return () => { vv.removeEventListener("resize", on); vv.removeEventListener("scroll", on); };
  }, []);
}

function Bar({ tab, setTab, command }: { tab: Tab; setTab: (t: Tab) => void; command: (t: string) => Promise<string> }) {
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<{ msg: string; err?: boolean; busy?: boolean } | null>(null);
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const textRef = useRef("");
  textRef.current = text;
  const busy = !!reply?.busy;
  useKeyboardInset();

  // Replies fade away by themselves, like a notification.
  useEffect(() => {
    if (!reply || reply.busy) return;
    const t = setTimeout(() => setReply(null), reply.err ? 9000 : 7000);
    return () => clearTimeout(t);
  }, [reply]);

  const open = () => { setAsking(true); setTimeout(() => input.current?.focus(), 30); };
  const close = () => { setAsking(false); input.current?.blur(); };

  const run = async (t: string) => {
    if (!t.trim() || busy) return;
    setReply({ msg: "Thinking", busy: true });
    input.current?.blur();
    try { const msg = await command(t.trim()); setReply({ msg }); setText(""); setAsking(false); }
    catch (e) { setReply({ msg: (e as Error).message, err: true }); }
  };

  const mic = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { setReply({ msg: "Dictation isn't available here. Use the microphone key on your keyboard instead.", err: true }); input.current?.focus(); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.lang = navigator.language || "en-IE"; r.interimResults = true;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(""));
    r.onend = () => { setListening(false); run(textRef.current); };
    r.onerror = () => setListening(false);
    rec.current = r; setText(""); setListening(true); r.start();
  };

  const index = TABS.findIndex((t) => t.id === tab);
  return (
    <div className={`bar ${asking ? "asking" : ""}`}>
      {reply && <div className={`reply glass ${reply.err ? "err" : ""} ${reply.busy ? "busy" : ""}`} role="status" onClick={() => !reply.busy && setReply(null)}>{reply.msg}</div>}
      <div className="bar-row">
        <nav className="tabs glass" aria-label="Sections">
          <span className="pill" style={{ transform: `translateX(${index * 100}%)` }} />
          {TABS.map((t) => (
            <button type="button" key={t.id} className={`tab ${t.id === tab ? "on" : ""}`} aria-current={t.id === tab ? "page" : undefined}
              aria-label={asking ? "Back to tabs" : t.label} onClick={() => (asking ? close() : setTab(t.id))}>
              <Icon name={t.icon} size={23} weight={t.id === tab ? 2.2 : 1.9} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <form className="ask glass" onSubmit={(e) => { e.preventDefault(); run(text); }}>
          {!asking ? (
            <button type="button" className="ask-open" aria-label="Ask Wall" onClick={open}><Icon name="sparkle" size={24} /></button>
          ) : (
            <>
              <button type="button" className={`ask-btn ${listening ? "live" : ""}`} aria-label={listening ? "Stop listening" : "Dictate"} onClick={mic}><Icon name="mic" size={21} /></button>
              <input ref={input} className="plain" placeholder={listening ? "Listening" : "Gym tomorrow at six"} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && close()} enterKeyHint="send" autoCapitalize="sentences" autoCorrect="on" aria-label="Ask Wall" />
              <button className="ask-btn send" aria-label="Send" disabled={busy || !text.trim()}><Icon name="up" size={19} weight={2.6} /></button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ---------------- page ----------------
export default function EditPage() {
  const { ready, session, board, calendar, live, send: rawSend, command } = useWall();
  const [tab, setTab] = useState<Tab>("lists");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [listSheet, setListSheet] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const send: Send = async (ops) => { setError(""); try { await rawSend(ops); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(""), 6000); return () => clearTimeout(t); }, [error]);
  const pick = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }); };

  if (!ready) return <main className="app" />;
  if (!DEMO && !session) return <Login />;
  if (!board) return <main className="app"><div className="loading"><span className="spinner" /></div></main>;

  const found = openItem ? board.lists.flatMap((l) => l.items.map((i) => ({ i, l }))).find((x) => x.i.id === openItem) : null;
  const editing = listSheet && listSheet !== "new" ? board.lists.find((l) => l.id === listSheet) ?? null : null;

  return (
    <main className="app">
      <div className="edge top" />
      <header className="nav">
        <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
        {DEMO ? <span className="status">Demo</span> : <span className={`status ${live ? "live" : ""}`}><i />{live ? "Live" : "Connecting"}</span>}
      </header>
      {error && <div className="toast glass" role="alert" onClick={() => setError("")}>{error}</div>}

      <div className="pane" key={tab}>
        {tab === "lists" && (
          <>
            {board.lists.map((l) => <ListGroup key={l.id} list={l} send={send} onOpen={(it) => setOpenItem(it.id)} onEdit={() => setListSheet(l.id)} />)}
            {board.lists.length === 0 && <div className="empty"><b>No lists yet</b><span>Add one, or tap the sparkle and say what is on your mind.</span></div>}
            <button type="button" className="capsule tinted add-list" onClick={() => setListSheet("new")}><Icon name="plus" size={17} weight={2.6} />Add List</button>
            <NoteGroup note={board.note} send={send} />
          </>
        )}
        {tab === "wall" && <WallTab board={board} calendar={calendar} send={send} />}
        {tab === "settings" && <SettingsTab board={board} calendar={calendar} email={session?.user.email} send={send} />}
      </div>

      {found && <ItemSheet item={found.i} list={found.l} board={board} send={send} onClose={() => setOpenItem(null)} />}
      {listSheet && (listSheet === "new" || editing) && <ListSheet list={editing} board={board} send={send} onClose={() => setListSheet(null)} />}
      <div className="edge bottom" />
      <Bar tab={tab} setTab={pick} command={command} />
    </main>
  );
}
