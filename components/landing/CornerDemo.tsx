"use client";
// The real corner pin, in miniature: drag a corner and the same matrix3d the projector uses warps the card.
import { useRef, useState } from "react";
import { warpTransform } from "@/lib/warp";

const W = 150, H = 240;
const START = [[0.1, 0.06], [0.86, 0.14], [0.93, 0.9], [0.04, 0.96]];

export default function CornerDemo() {
  const pad = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState(START);
  const drag = useRef(-1);
  const move = (e: React.PointerEvent) => {
    if (drag.current < 0 || !pad.current) return;
    const r = pad.current.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    setPts(pts.map((p, i) => (i === drag.current ? [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)] : p)));
  };
  const end = () => { drag.current = -1; };
  return (
    <div className="corner-demo" ref={pad} style={{ width: W, height: H }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div className="mini-wall" style={{ width: W, height: H, transform: warpTransform(pts, W, H, W, H) }}>
        <b>09:41</b><i style={{ width: "70%" }} /><i style={{ width: "52%", background: "#0a84ff" }} /><i style={{ width: "62%" }} /><i style={{ width: "40%", background: "#ff453a" }} /><i style={{ width: "56%" }} />
      </div>
      {pts.map(([x, y], i) => (
        <span key={i} className="handle" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          onPointerDown={(e) => { drag.current = i; (e.target as HTMLElement).setPointerCapture(e.pointerId); }} />
      ))}
    </div>
  );
}
