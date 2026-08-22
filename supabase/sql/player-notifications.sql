-- Player account + notification setup
-- Run once in Supabase SQL Editor.

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.player_registrations
  add column if not exists player_id uuid references public.players(id) on delete set null;

create index if not exists player_registrations_player_id_idx
  on public.player_registrations(player_id);

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

create or replace function public.link_player_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  registration_row public.player_registrations%rowtype;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'Authentication session is required.';
  end if;

  select * into registration_row
  from public.player_registrations
  where lower(trim(email)) = current_email
    and lower(coalesce(status, '')) = 'approved'
  order by created_at desc
  limit 1;

  if registration_row.id is null then
    raise exception 'No approved player registration was found for this email.';
  end if;

  if registration_row.player_id is null then
    raise exception 'Your approved registration is missing its player profile. Please contact the admin.';
  end if;

  update public.players
  set user_id = current_user_id
  where id = registration_row.player_id
    and (user_id is null or user_id = current_user_id);

  if not found then
    raise exception 'This player profile is already linked to another account.';
  end if;

  update public.player_registrations
  set user_id = current_user_id
  where id = registration_row.id
    and (user_id is null or user_id = current_user_id);

  insert into public.player_notifications(user_id, title, message, type)
  select
    current_user_id,
    'Registration approved',
    'Your player registration has been approved. Welcome to SBT MAJOR.',
    'success'
  where not exists (
    select 1 from public.player_notifications
    where user_id = current_user_id
      and type = 'success'
      and title = 'Registration approved'
  );

  return jsonb_build_object(
    'player_id', registration_row.player_id,
    'registration_id', registration_row.id,
    'nickname', registration_row.nickname,
    'real_name', registration_row.real_name,
    'email', current_email
  );
end;
$$;

grant execute on function public.link_player_account() to authenticated;

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
    select name into team_name from public.teams where id = new.team_id;
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

drop trigger if exists player_sale_notification_trigger on public.players;
create trigger player_sale_notification_trigger
after update of status, team_id, sold_price on public.players
for each row execute function public.notify_player_sale();

do $$
begin
  alter publication supabase_realtime add table public.player_notifications;
exception
  when duplicate_object then null;
end;
$$;
