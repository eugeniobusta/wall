// Made-up data for demo mode (no Supabase keys) and for the public landing page.
import { COLORS, DEFAULT_SETTINGS, newId, type Board, type Calendar } from "./board";

const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
const day = (days: number) => { const d = at(days, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function demoBoard(): Board {
  return {
    lists: [
      { id: "hack", title: "Hackathons", color: COLORS[0], items: [{ id: newId(), text: "Space apps weekend", due: day(9) }, { id: newId(), text: "Submit team form", due: day(2) }] },
      { id: "proj", title: "Projects", color: COLORS[1], items: [{ id: newId(), text: "Portfolio redesign" }, { id: newId(), text: "Compiler coursework", due: day(1) }, { id: newId(), text: "Tennis club site" }, { id: newId(), text: "Update CV", done: true }] },
    ],
    note: "Ship the portfolio this week",
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

export function demoCalendar(): Calendar {
  const hour = new Date().getHours();
  const soon = Math.min(hour + 1, 23);
  return {
    events: [
      { title: "Operating Systems lecture", start: at(0, soon).toISOString(), end: at(0, soon, 50).toISOString(), allDay: false, location: "Room L101", calendar: "University", color: "#0A84FF" },
      { title: "Lab tutoring", start: at(1, 10).toISOString(), end: at(1, 12).toISOString(), allDay: false, location: "LG25", calendar: "Work", color: "#30D158" },
      { title: "Requirements spec due", start: at(2, 0).toISOString(), end: at(2, 23, 59).toISOString(), allDay: true, location: "", calendar: "University", color: "#FF453A" },
      { title: "Gym", start: at(3, 18).toISOString(), end: at(3, 19).toISOString(), allDay: false, location: "", calendar: "Personal", color: "#FFD60A" },
    ],
    reminders: [{ title: "Pay rent", list: "Reminders", due: at(1, 9).toISOString() }, { title: "Buy an HDMI extender", list: "Reminders" }],
    calendarAccess: true, remindersAccess: true,
    syncedAt: new Date().toISOString(),
  };
}
