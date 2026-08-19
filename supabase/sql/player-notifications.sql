-- Player notification + login foundation
-- Run once in Supabase SQL Editor.

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.player_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists player_notifications_user_id_idx
  on public.player_notifications(user_id, created_at desc);

alter table public.player_notifications enable row level security;

drop policy if exists "players can read own notifications" on public.player_notifications;
create policy "players can read own notifications"
on public.player_notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "players can mark own notifications read" on public.player_notifications;
create policy "players can mark own notifications read"
on public.player_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.notify_player_registration_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  approved_player_id uuid;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  if target_user_id is not null and coalesce(old.status, '') <> new.status then
    if lower(new.status) = 'approved' then
      select id
        into approved_player_id
      from public.players
      where user_id is null
        and lower(coalesce(nickname, '')) = lower(coalesce(new.nickname, ''))
      order by created_at desc
      limit 1;

      if approved_player_id is not null then
        update public.players
        set user_id = target_user_id
        where id = approved_player_id;
      end if;

      insert into public.player_notifications(user_id, title, message, type)
      values (
        target_user_id,
        'Registration approved',
        'Your player registration has been approved. Welcome to SBT MAJOR.',
        'success'
      );
    elsif lower(new.status) = 'rejected' then
      insert into public.player_notifications(user_id, title, message, type)
      values (
        target_user_id,
        'Registration update',
        coalesce(nullif(new.admin_note, ''), 'Your player registration was not approved.'),
        'warning'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists player_registration_notification_trigger
  on public.player_registrations;
create trigger player_registration_notification_trigger
after update of status, user_id on public.player_registrations
for each row
execute function public.notify_player_registration_change();

create or replace function public.notify_player_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  team_name text;
begin
  if new.user_id is not null
     and lower(coalesce(old.status, 'unsold')) <> 'sold'
     and lower(coalesce(new.status, 'unsold')) = 'sold' then

    select name into team_name
    from public.teams
    where id = new.team_id;

    insert into public.player_notifications(user_id, title, message, type)
    values (
      new.user_id,
      'You were sold!',
      'Congratulations! You were sold to ' || coalesce(team_name, 'your team') ||
        ' for ' || coalesce(new.sold_price, 0)::text || ' credits.',
      'auction'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists player_sale_notification_trigger
  on public.players;
create trigger player_sale_notification_trigger
after update of status, team_id, sold_price on public.players
for each row
execute function public.notify_player_sale();

do $$
begin
  alter publication supabase_realtime add table public.player_notifications;
exception
  when duplicate_object then null;
end;
$$;
