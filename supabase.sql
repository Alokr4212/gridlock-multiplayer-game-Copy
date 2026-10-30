-- Gridlock multiplayer Tic-Tac-Toe database setup.
-- Demo-only permissive policies; add server-side validation for production.
create table if not exists public.ttt_rooms (
  code text primary key,
  board jsonb not null default '[null,null,null,null,null,null,null,null,null]'::jsonb,
  turn text not null default 'X' check (turn in ('X','O')),
  status text not null default 'waiting' check (status in ('waiting','playing','finished')),
  player_x text not null,
  player_o text,
  player_x_name text not null default 'Player X',
  player_o_name text,
  winner text check (winner in ('X','O','draw') or winner is null),
  winning_line jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ttt_rooms enable row level security;
drop policy if exists "Demo rooms can be read by anyone" on public.ttt_rooms;
create policy "Demo rooms can be read by anyone" on public.ttt_rooms for select to anon, authenticated using (true);
drop policy if exists "Demo rooms can be created by anyone" on public.ttt_rooms;
create policy "Demo rooms can be created by anyone" on public.ttt_rooms for insert to anon, authenticated with check (true);
drop policy if exists "Demo rooms can be updated by anyone" on public.ttt_rooms;
create policy "Demo rooms can be updated by anyone" on public.ttt_rooms for update to anon, authenticated using (true) with check (true);
do $$
begin
  alter publication supabase_realtime add table public.ttt_rooms;
exception when duplicate_object then null;
when undefined_object then raise notice 'Enable Realtime for ttt_rooms in Supabase dashboard.';
end $$;