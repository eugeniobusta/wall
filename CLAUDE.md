# Wall — project notes for Claude Code

Busta's projected smart whiteboard. A Magcubic HY300 Pro projector, rotated to portrait, shows a live dashboard on
a 55 × 90 cm whiteboard strip next to his desk in his Dublin student room. He edits it from his phone at
https://wall.eugeniobusta.com or by voice ("Hey Siri, Wall").

## Architecture

- **Next.js 15 (App Router) on Vercel**, GitHub repo `wall` (private), domain `wall.eugeniobusta.com`.
  - `/`: public landing page (what the project is, live demo scene). A signed-in owner is redirected to `/edit`; `/?about` skips that.
  - `/wall`: projector page. Fixed 720×1280 canvas (`components/WallCanvas.tsx`), scaled to the window, optional 4-corner warp
    (`settings.warp`, math in `lib/warp.ts`). Goes black when `settings.power` is false or inside `settings.quiet` hours.
    Reloads itself when `/api/version` changes (new deploy).
  - `/edit`: the app, phone-first and installable (manifest `start_url`). Tabs: Lists, Wall (live preview + power), Settings.
    The floating bar's sparkle button opens Ask, which sends a sentence to Claude.
  - `POST /api/ops` `{ops}`: applies board ops server-side (atomic, optimistic concurrency on `updated_at`).
  - `POST /api/command` `{text}`: Claude API (forced tool call `update_wall`) turns a sentence into ops + a reply.
  - Both API routes accept `Authorization: Bearer <Supabase access token of ALLOWED_EMAIL>` or `Bearer <WALL_API_TOKEN>` (Siri shortcut).
- **Supabase** (project `wall`, region West EU / Ireland): tables `board` and `calendar_snapshot`, one row each (`id = 1`, `data jsonb`).
  RLS: only the `ALLOWED_EMAIL` account can SELECT; nobody writes from the browser (service role only). Both tables are in the
  `supabase_realtime` publication. Schema: `supabase/schema.sql`. Login = email + password, sign-ups disabled.
- **Wall Agent** (`agent/`): background macOS app in Swift (EventKit). Uploads Apple Calendar (15 days) + open Reminders to
  `calendar_snapshot` every 5 min and ~3 s after any calendar change. Installed by `agent/install.sh` into
  `~/Applications/Wall Agent.app`, config in `~/Library/Application Support/WallAgent/config.json`, log in `~/Library/Logs/WallAgent.log`.
- **Wall Display** (`display/install.sh`): builds `~/Applications/Wall Display.app`, which opens `/wall` in Chrome app mode with its
  own profile (`~/Library/Application Support/WallDisplay`) under `caffeinate -d`.
- **Infra ids**: Supabase project ref `lownfdzlqtaotduyehna` (org `wrek`); Vercel project `eugeniobustas-projects/wall`;
  DNS for eugeniobusta.com is at Porkbun (not Vercel), so domain records are added there by hand.
- **Demo mode**: with no `NEXT_PUBLIC_SUPABASE_*` env, the app runs without login and keeps data in localStorage.
- The board model and every allowed change live in `lib/board.ts` (`applyOps`). Keep that the single source of truth.

## Env vars (`.env.local`, same set on Vercel for Production + Preview)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon), `SUPABASE_SERVICE_ROLE_KEY` (secret),
`ANTHROPIC_API_KEY`, `ALLOWED_EMAIL`, `WALL_API_TOKEN`, `WALL_MODEL` (default `claude-haiku-5-5`).
Optional: `NEXT_PUBLIC_WALL_LAT`, `NEXT_PUBLIC_WALL_LON`, `NEXT_PUBLIC_WALL_TIMEZONE` (defaults in `lib/config.ts`).

## Commands

- `npm install`, `npm run dev` (localhost:3000), `npm run build`, `npm run typecheck`
- `cd agent && ./install.sh` builds and (re)installs the Mac agent
- Vercel CLI: use `npx vercel@latest` (the installed 54.x can't add Preview env vars). Never run `vercel env pull` over `.env.local`.
- Test the API without a browser: `curl -s localhost:3000/api/command -H "authorization: Bearer $WALL_API_TOKEN" -H 'content-type: application/json' -d '{"text":"add test item to Projects"}'`

## Rules

- Never print, log, commit or paste secret values (service role key, Anthropic key, WALL_API_TOKEN, passwords). Refer to them by name.
  Exception: when Busta explicitly asks to see WALL_API_TOKEN to set up the Siri shortcut.
- `.env.local` is gitignored; keep it that way. Never commit `agent/config.json` or anything under `agent/build/`.
- The projector must never join any network: its stock firmware contains malware (SilentSDK / KKOIP proxy). It is only an HDMI display.
- Ask before anything irreversible: deleting the Supabase project or data, force-pushing, removing domains.
- UI: dark only, iOS system look (system font, system colours, grouped lists, glass only on the floating navigation layer).
  Tokens and every style live in `app/globals.css`. No emoji and no dashes in interface copy. Icons are the line set in `components/Icon.tsx`.
- The repo is public: never commit personal data (emails, calendar contents, screenshots of the real board). Docs screenshots use demo mode.
- To look at the UI without a login: `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npx next dev -p 3207` (demo mode).
  Stop dev servers by port (`kill $(lsof -ti:PORT)`), never with a broad `pkill`: other projects run Next on this Mac too.
