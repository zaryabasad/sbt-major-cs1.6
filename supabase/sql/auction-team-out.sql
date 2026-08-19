-- Live auction: allow a team admin to permanently opt out of the current player.

create table if not exists public.auction_team_out (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (player_id, team_id)
);

create index if not exists auction_team_out_player_idx
  on public.auction_team_out(player_id);

alter table public.auction_team_out enable row level security;

drop policy if exists "auction admins can view out teams"
  on public.auction_team_out;

create policy "auction admins can view out teams"
on public.auction_team_out
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
      and a.role in ('team_admin', 'super_admin')
  )
);

drop policy if exists "team admins can mark their team out"
  on public.auction_team_out;

create policy "team admins can mark their team out"
on public.auction_team_out
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
      and a.role = 'team_admin'
      and a.team_id = team_id
  )
);

-- A team that has opted out can no longer submit another bid for that player.
create or replace function public.prevent_bid_after_team_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.type, 'bid')) = 'bid'
     and exists (
       select 1
       from public.auction_team_out o
       where o.player_id = new.player_id
         and o.team_id = new.team_id
     ) then
    raise exception 'This team is OUT for the current player.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_bid_after_team_out_trigger
  on public.auction_history;

create trigger prevent_bid_after_team_out_trigger
before insert on public.auction_history
for each row
execute function public.prevent_bid_after_team_out();

-- Let the UI see OUT events in real time.
do $$
begin
  alter publication supabase_realtime
    add table public.auction_team_out;
exception
  when duplicate_object then null;
end;
$$;

-- No update/delete policy on purpose: once a team is OUT for a player,
-- it stays OUT until a different player is put on the auction block.
