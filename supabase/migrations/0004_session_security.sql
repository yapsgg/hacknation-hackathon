-- Replace the hackathon-wide anonymous Realtime read policy with ownership RLS.
-- Apply only after Supabase Auth is enabled and server-created sessions set
-- sessions.owner_id = auth.uid(). Existing ownerless rows remain server-only.

alter table public.sessions
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create index if not exists sessions_owner_idx on public.sessions(owner_id);

revoke select on public.events, public.questions, public.gaps from anon;

drop policy if exists "anon read events" on public.events;
drop policy if exists "anon read questions" on public.questions;
drop policy if exists "anon read gaps" on public.gaps;

grant select on public.sessions, public.events, public.questions, public.gaps
  to authenticated;

drop policy if exists "owners read sessions" on public.sessions;
create policy "owners read sessions" on public.sessions
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "owners read events" on public.events;
create policy "owners read events" on public.events
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = events.session_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "owners read questions" on public.questions;
create policy "owners read questions" on public.questions
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = questions.session_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "owners read gaps" on public.gaps;
create policy "owners read gaps" on public.gaps
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = gaps.session_id and s.owner_id = auth.uid()
    )
  );
