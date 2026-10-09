-- MobDisc MVP schema for Supabase.
-- Apply this file in Supabase SQL Editor. Review policies before public launch.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[a-z0-9_-]{1,24}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_name text not null references public.channels(name) on update cascade on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists messages_channel_created_idx
  on public.messages(channel_name, created_at desc);

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.friendships enable row level security;

-- Public usernames are visible for friend lookup; users can only edit their own profile.
create policy "Profiles can be read by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can create their profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users can read channels"
  on public.channels for select to authenticated using (true);
create policy "Authenticated users can create channels"
  on public.channels for insert to authenticated with check (auth.uid() = created_by);

create policy "Authenticated users can read messages"
  on public.messages for select to authenticated using (true);
create policy "Users can send messages as themselves"
  on public.messages for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can see their own friendship list"
  on public.friendships for select to authenticated using (auth.uid() = user_id);
create policy "Users can add themselves to a friendship list"
  on public.friendships for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can remove their own friendships"
  on public.friendships for delete to authenticated using (auth.uid() = user_id);

insert into public.channels(name) values ('geral'), ('memes'), ('games')
on conflict (name) do nothing;

-- Keep profile creation aligned with the auth user metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  chosen_username text;
begin
  chosen_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  chosen_username := left(chosen_username, 24);
  if length(chosen_username) < 3 then chosen_username := 'user_' || left(replace(new.id::text, '-', ''), 8); end if;
  insert into public.profiles(id, username)
  values (new.id, chosen_username)
  on conflict (id) do nothing;
  return new;
exception when unique_violation then
  insert into public.profiles(id, username)
  values (new.id, 'user_' || left(replace(new.id::text, '-', ''), 8))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();