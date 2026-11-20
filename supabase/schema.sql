-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Before running: replace you@example.com (twice) with the email you will sign in with.
-- It must match ALLOWED_EMAIL in your environment variables.

create table if not exists public.board (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_snapshot (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.board enable row level security;
alter table public.calendar_snapshot enable row level security;

-- Table privileges, as a second lock behind RLS: signed-in users may only read,
-- anonymous visitors get nothing, and only the service role (API routes, Mac agent) writes.
revoke all on public.board, public.calendar_snapshot from anon, authenticated;
grant select on public.board, public.calendar_snapshot to authenticated;
grant all on public.board, public.calendar_snapshot to service_role;

-- Only your account can read. Nobody can write from the browser:
-- writes go through the app's API routes and the Mac agent, which use the service role key.
drop policy if exists "owner reads board" on public.board;
create policy "owner reads board" on public.board
  for select to authenticated using (((select auth.jwt()) ->> 'email') = 'you@example.com');

drop policy if exists "owner reads calendar" on public.calendar_snapshot;
create policy "owner reads calendar" on public.calendar_snapshot
  for select to authenticated using (((select auth.jwt()) ->> 'email') = 'you@example.com');

-- Live updates to the wall.
do $$ begin
  alter publication supabase_realtime add table public.board;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.calendar_snapshot;
exception when duplicate_object then null; end $$;
