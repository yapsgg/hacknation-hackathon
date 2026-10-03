-- AI Apprentice: initial schema.
-- Run in Supabase SQL Editor (or `supabase db push`). Safe to re-run.
--
-- Access model (hackathon): the Next.js API routes write with the service-role
-- key (bypasses RLS). The browser uses the anon key for READ-ONLY Realtime on
-- events / questions / gaps. Nothing is writable by anon.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- sessions
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  mode        text not null default 'interview'
                check (mode in ('interview', 'teach')),
  expert      text,
  off_record  boolean not null default false,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

-- ------------------------------------------------------------------ events
-- Mirrors schemas/event.schema.json. `from`/`to` are reserved-ish words and may
-- be number|string|null, so they are stored as jsonb in from_val / to_val.
create table if not exists public.events (
  id              bigint generated always as identity primary key,
  session_id      uuid not null references public.sessions (id) on delete cascade,
  t               numeric not null check (t >= 0),
  type            text not null check (type in (
                    'field_changed', 'doc_opened', 'doc_scrolled',
                    'value_entered', 'save_clicked', 'navigation')),
  object          text not null,
  field           text,
  from_val        jsonb,
  to_val          jsonb,
  evidence_frame  text,
  salient_text    text[] not null default '{}',
  confidence      numeric check (confidence is null or (confidence between 0 and 1)),
  source          text not null default 'vision' check (source in ('vision', 'app')),
  created_at      timestamptz not null default now()
);
create index if not exists events_session_t_idx on public.events (session_id, t);

-- --------------------------------------------------------------- questions
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  text        text not null,
  anchor      text,
  step_id     integer,
  asked_t     numeric,
  answer      text,
  created_at  timestamptz not null default now()
);
create index if not exists questions_session_idx on public.questions (session_id);

-- -------------------------------------------------------------------- gaps
create table if not exists public.gaps (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  step_id     integer,
  question    text not null,
  risk        text not null default 'medium' check (risk in ('high', 'medium', 'low')),
  status      text not null default 'open' check (status in ('open', 'closed', 'waived')),
  created_at  timestamptz not null default now()
);
create index if not exists gaps_session_idx on public.gaps (session_id);

-- ---------------------------------------------------------------- work_maps
-- `data` holds a document validated against schemas/work-map.schema.json.
create table if not exists public.work_maps (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid references public.sessions (id) on delete cascade,
  data                 jsonb not null,
  confirmed_by_expert  boolean not null default false,
  correction_count     integer not null default 0,
  is_seed              boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------- mastery
create table if not exists public.mastery (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  rule_id     text not null,
  state       text not null default 'unseen'
                check (state in ('unseen', 'shown', 'predicted', 'applied')),
  updated_at  timestamptz not null default now(),
  unique (session_id, rule_id)
);

-- --------------------------------------------------------------------- RLS
alter table public.sessions   enable row level security;
alter table public.events     enable row level security;
alter table public.questions  enable row level security;
alter table public.gaps       enable row level security;
alter table public.work_maps  enable row level security;
alter table public.mastery    enable row level security;

-- Read-only anon access for the live feeds (Realtime respects these policies).
grant select on public.events, public.questions, public.gaps to anon;

drop policy if exists "anon read events" on public.events;
create policy "anon read events" on public.events
  for select to anon using (true);

drop policy if exists "anon read questions" on public.questions;
create policy "anon read questions" on public.questions
  for select to anon using (true);

drop policy if exists "anon read gaps" on public.gaps;
create policy "anon read gaps" on public.gaps
  for select to anon using (true);

-- ---------------------------------------------------------------- Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.events;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.questions;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.gaps;
    exception when duplicate_object then null; end;
  end if;
end $$;

-- ----------------------------------------------------------------- Storage
-- Private bucket for captured frames. Only the service role touches it.
insert into storage.buckets (id, name, public)
values ('frames', 'frames', false)
on conflict (id) do nothing;

-- ------------------------------------------------------- off-the-record purge
-- Hard-deletes rows captured inside an off-the-record window.
-- (Stored frame objects must be removed via the Storage API by the caller.)
create or replace function public.purge_window(
  p_session uuid, p_from numeric, p_to numeric
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.events
   where session_id = p_session and t >= p_from and t <= p_to;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_window(uuid, numeric, numeric) from public, anon, authenticated;
