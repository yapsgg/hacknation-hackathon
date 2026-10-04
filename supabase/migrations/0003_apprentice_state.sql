-- Persist the integrated /apprentice UI state without placing private state
-- in the public Realtime tables. Safe to re-run after 0001 and 0002.

create table if not exists public.apprentice_states (
  session_id  uuid primary key references public.sessions (id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.apprentice_states enable row level security;

-- The browser never reads or writes this table directly. Next.js route
-- handlers use the service role and return only the requested session.
revoke all on public.apprentice_states from anon, authenticated;
