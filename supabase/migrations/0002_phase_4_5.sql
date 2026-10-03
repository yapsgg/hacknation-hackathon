-- AI Apprentice: Phase 4 tutor state + Phase 5 privacy audit trail.
-- Safe to re-run after 0001_init.sql.

alter table public.sessions
  add column if not exists frames_retained boolean not null default false;

alter table public.mastery drop constraint if exists mastery_state_check;
alter table public.mastery
  add constraint mastery_state_check
  check (state in ('unseen', 'hit', 'missed', 'shown', 'predicted', 'applied'));

create table if not exists public.review_audit (
  id          bigint generated always as identity primary key,
  session_id  uuid references public.sessions (id) on delete cascade,
  action      text not null,
  actor       text not null default 'app',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists review_audit_session_idx
  on public.review_audit (session_id, created_at);

create table if not exists public.privacy_windows (
  id              bigint generated always as identity primary key,
  session_id      uuid not null references public.sessions (id) on delete cascade,
  from_t          numeric not null check (from_t >= 0),
  to_t            numeric not null check (to_t >= from_t),
  events_removed  integer not null default 0,
  frames_removed  integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists privacy_windows_session_idx
  on public.privacy_windows (session_id, from_t);

create table if not exists public.transcripts (
  id                bigint generated always as identity primary key,
  session_id        uuid not null references public.sessions (id) on delete cascade,
  t                 numeric not null check (t >= 0),
  role              text not null check (role in ('user', 'agent')),
  redacted_text     text not null,
  redaction_count   integer not null default 0,
  redaction_provider text not null,
  created_at        timestamptz not null default now()
);
create index if not exists transcripts_session_t_idx
  on public.transcripts (session_id, t);

alter table public.review_audit enable row level security;
alter table public.privacy_windows enable row level security;
alter table public.transcripts enable row level security;

-- Replace the original purge function so an off-record window also removes
-- redacted transcript rows. Frame objects are removed by the Next.js route.
create or replace function public.purge_window(
  p_session uuid, p_from numeric, p_to numeric
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_events integer;
  removed_transcripts integer;
begin
  delete from public.events
   where session_id = p_session and t >= p_from and t <= p_to;
  get diagnostics removed_events = row_count;

  delete from public.transcripts
   where session_id = p_session and t >= p_from and t <= p_to;
  get diagnostics removed_transcripts = row_count;

  return removed_events + removed_transcripts;
end;
$$;

revoke all on function public.purge_window(uuid, numeric, numeric)
  from public, anon, authenticated;
