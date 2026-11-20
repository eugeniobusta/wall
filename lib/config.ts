// The few things that differ from one wall to the next. Override them with env vars
// (see .env.example); the defaults are the author's room in Dublin.
const num = (v: string | undefined, fallback: number) => (v && Number.isFinite(Number(v)) ? Number(v) : fallback);

/** Where the weather is read for. */
export const PLACE = { lat: num(process.env.NEXT_PUBLIC_WALL_LAT, 53.385), lon: num(process.env.NEXT_PUBLIC_WALL_LON, -6.257) };

/** The timezone Claude resolves "tomorrow" and "friday" in. */
export const TIMEZONE = process.env.NEXT_PUBLIC_WALL_TIMEZONE || "Europe/Dublin";

export const SITE = {
  url: "https://wall.eugeniobusta.com",
  repo: "https://github.com/eugeniobusta/wall",
  author: "Eugenio Bustamante",
  authorUrl: "https://eugeniobusta.com",
};
