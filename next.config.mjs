// Security headers for every response. The app only talks to itself, Supabase (REST + realtime
// websocket) and Open-Meteo, and may only be framed by itself (the Preview tab embeds /wall).
const supabase = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host; } catch { return ""; }
})();
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.open-meteo.com${supabase ? ` https://${supabase} wss://${supabase}` : ""}${dev ? " ws:" : ""}`,
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), microphone=(self)" },
      ],
    }, {
      // Only the landing page is meant to be found.
      source: "/:path(edit|wall|api/.*)",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }];
  },
};
