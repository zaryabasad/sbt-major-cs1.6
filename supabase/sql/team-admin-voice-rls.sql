-- Run this in Supabase SQL Editor.
-- The client uses a private Realtime channel named:
-- sbt-major-team-admin-voice
-- Only authenticated users listed as team_admin or super_admin
-- in public.admin_users may receive/send Broadcast or Presence events.

create policy "team admins can receive voice room events"
on realtime.messages
for select
to authenticated
using (
  realtime.topic() = 'sbt-major-team-admin-voice'
  and realtime.messages.extension in ('broadcast', 'presence')
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.role in ('team_admin', 'super_admin')
  )
);

create policy "team admins can send voice room events"
on realtime.messages
for insert
to authenticated
with check (
  realtime.topic() = 'sbt-major-team-admin-voice'
  and realtime.messages.extension in ('broadcast', 'presence')
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.role in ('team_admin', 'super_admin')
  )
);
