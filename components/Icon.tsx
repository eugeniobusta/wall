// Line icons drawn for this app on a 24 grid, in the weight and roundness of the system symbols.
import type { ReactNode } from "react";

const dot = (cx: number, cy: number, r = 1.3) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

const PATHS: Record<string, ReactNode> = {
  list: <>{dot(4.5, 6)}{dot(4.5, 12)}{dot(4.5, 18)}<path d="M9 6h11M9 12h11M9 18h11" /></>,
  wall: <><rect x="6" y="2.5" width="12" height="19" rx="3.2" /><path d="M9.5 8h5M9.5 12h5M9.5 16h3" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h8M16 17h4" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="14" cy="17" r="2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: <>{dot(5.5, 12, 1.6)}{dot(12, 12, 1.6)}{dot(18.5, 12, 1.6)}</>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M4 7h16M10 3.5h4M6.5 7l1 12.4a1.6 1.6 0 0 0 1.6 1.6h5.8a1.6 1.6 0 0 0 1.6-1.6l1-12.4M10 11v6M14 11v6" />,
  sparkle: <><path d="M11 4l1.9 5.1L18 11l-5.1 1.9L11 18l-1.9-5.1L4 11l5.1-1.9z" /><path d="M18.5 3.5v3M17 5h3M19 17.5v3M17.5 19h3" /></>,
  moon: <path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z" />,
  power: <><path d="M12 3v8" /><path d="M6.6 6.6a8 8 0 1 0 10.8 0" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3.2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  corners: <><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.8" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  shield: <path d="M12 3l7.5 2.8v5.6c0 4.4-3 8-7.5 9.6-4.5-1.600-7.5-5.200-7.500-9.600V5.800z" />,
  cloud: <path d="M7 18.5a4.2 4.2 0 0 1-.6-8.360A5.800 5.800 0 0 1 17.600 9.200 4.700 4.700 0 0 1 17 18.500z" />,
  github: <path fill="currentColor" stroke="none" d="M12 .3a12 12 0 0 0-3.800 23.380c.6.110.820-.260.820-.580l-.020-2.040c-3.340.720-4.040-1.610-4.040-1.610-.550-1.390-1.340-1.760-1.340-1.760-1.080-.740.090-.730.090-.730 1.200.090 1.840 1.240 1.840 1.240 1.070 1.830 2.800 1.300 3.490 1 .110-.780.420-1.310.760-1.610-2.660-.300-5.470-1.330-5.470-5.930 0-1.310.470-2.380 1.240-3.220-.140-.300-.540-1.520.100-3.180 0 0 1-.320 3.300 1.230a11.500 11.500 0 0 1 6 0c2.280-1.550 3.290-1.230 3.290-1.230.640 1.660.240 2.880.120 3.180a4.650 4.650 0 0 1 1.230 3.220c0 4.610-2.800 5.620-5.480 5.920.420.360.810 1.100.810 2.220l-.010 3.290c0 .320.210.690.820.570A12 12 0 0 0 12 .3" />,
};

export type IconName = "list" | "wall" | "sliders" | "mic" | "up" | "down" | "plus" | "more" | "check" | "chevron" | "close" | "trash"
  | "sparkle" | "moon" | "power" | "calendar" | "corners" | "lock" | "bolt" | "shield" | "cloud" | "github";

export default function Icon({ name, size = 22, weight = 1.9 }: { name: IconName; size?: number; weight?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={weight}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
