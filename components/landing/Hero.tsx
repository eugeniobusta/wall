"use client";
// The hero scene: a phone on the right "types" a sentence, and the wall on the left changes.
// Nothing here is a recording. The board is the same model, changed by the same applyOps, as the real app.
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { WallFrame, useNow } from "@/components/WallCanvas";
import { applyOps, type Board, type Calendar, type Op } from "@/lib/board";
import { demoBoard, demoCalendar } from "@/lib/demo";
import { dueLabel, urgency, ymd } from "@/lib/time";

const WX = { temp: 11, sky: "Cloudy", rain: "Rain likely 17:00" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const friday = () => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); return ymd(d); };

type Step = { say: string; reply: string; ops: (b: Board) => Op[] };
const SCRIPT: Step[] = [
  { say: "Pitch deck for the hackathon, due Friday", reply: "Added Pitch deck to Hackathons, due Friday.", ops: () => [{ op: "addItem", listId: "hack", text: "Pitch deck", due: friday() }] },
  { say: "I finished the compiler coursework", reply: "Ticked off Compiler coursework.", ops: (b) => { const i = b.lists[1].items.find((x) => x.text.startsWith("Compiler")); return i ? [{ op: "updateItem", itemId: i.id, done: true }] : []; } },
  { say: "Put demo day is Thursday as the note", reply: "The note now says Demo day is Thursday.", ops: () => [{ op: "setNote", text: "Demo day is Thursday" }] },
];

export default function Hero() {
  const now = useNow(10_000);
  const [board, setBoard] = useState<Board | null>(null);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [typed, setTyped] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let b = demoBoard();
    setBoard(b); setCalendar(demoCalendar());
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    (async () => {
      await sleep(1800);
      while (live) {
        for (const step of SCRIPT) {
          for (let i = 1; i <= step.say.length && live; i++) { setTyped(step.say.slice(0, i)); await sleep(38); }
          await sleep(450); if (!live) return;
          setTyped(""); setReply("Thinking"); await sleep(1000); if (!live) return;
          b = applyOps(b, step.ops(b)); setBoard(b); setReply(step.reply);
          await sleep(3200); if (!live) return;
          setReply(null); await sleep(700);
        }
        await sleep(1500); if (!live) return;
        b = demoBoard(); setBoard(b);
      }
    })();
    return () => { live = false; };
  }, []);

  const list = board?.lists[0];
  return (
    <div className="scene" aria-hidden="true">
      <div className="beam" />
      <div className="whiteboard">
        <WallFrame board={board} calendar={calendar} now={now} wx={WX} />
      </div>
      <div className="phone">
        <div className="phone-screen">
          <div className="ph-island" />
          <div className="ph-title">Lists</div>
          {list && (
            <div className="group" style={{ "--accent": list.color } as React.CSSProperties}>
              <div className="group-head"><h2>{list.title}</h2><span className="count">{list.items.filter((i) => !i.done).length}</span></div>
              <div className="cells">
                {list.items.slice(0, 4).map((i) => (
                  <div className="cell item" key={i.id}>
                    <span className="check" />
                    <span className="item-body"><span className="text">{i.text}</span>{i.due && <span className={`when ${urgency(i.due)}`}>{dueLabel(i.due)}</span>}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="ph-bar">
            {reply && <div className={`reply glass ${reply === "Thinking" ? "busy" : ""}`}>{reply}</div>}
            <div className="ask glass">
              <span className="ask-btn"><Icon name="mic" size={17} /></span>
              <span className={`ph-input ${typed ? "" : "empty"}`}>{typed || "Ask Wall"}{typed && <i className="caret" />}</span>
              <span className={`ask-btn send ${typed ? "" : "off"}`}><Icon name="up" size={15} weight={2.8} /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
