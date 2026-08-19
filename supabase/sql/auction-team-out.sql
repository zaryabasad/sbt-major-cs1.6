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

-- No update/delete policy on purpose: once a team is OUT for a player,
-- it stays OUT until a different player is put on the auction block.
