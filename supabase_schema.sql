-- SQL Schema for TravelMaps Supabase Setup

-- Drop existing tables to ensure clean schema recreate
drop table if exists public.notifications cascade;
drop table if exists public.places cascade;
drop table if exists public.friends cascade;
drop table if exists public.profiles cascade;

-- Enable UUID extension just in case
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile." on public.profiles;
create policy "Users can insert own profile." on public.profiles for insert with check (auth.uid() = id);

-- Trigger to create a profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it already exists to prevent errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Friends Table (Must be created before Places so Places can reference it in policies)
create table if not exists public.friends (
  id uuid default uuid_generate_v4() primary key,
  user_id_1 uuid references public.profiles(id) not null,
  user_id_2 uuid references public.profiles(id) not null,
  action_user_id uuid references public.profiles(id) not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id_1, user_id_2) -- prevent duplicate requests
);

alter table public.friends enable row level security;
-- View own friends
drop policy if exists "View friends" on public.friends;
create policy "View friends" on public.friends for select using (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
drop policy if exists "Insert friend" on public.friends;
create policy "Insert friend" on public.friends for insert with check ((auth.uid() = user_id_1 OR auth.uid() = user_id_2) AND auth.uid() = action_user_id);
drop policy if exists "Update friend" on public.friends;
create policy "Update friend" on public.friends for update using (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
drop policy if exists "Delete friend" on public.friends;
create policy "Delete friend" on public.friends for delete using (auth.uid() = user_id_1 OR auth.uid() = user_id_2);


-- 3. Places Table
drop type if exists visibility_status cascade;
create type visibility_status as enum ('private', 'friends', 'public');

create table if not exists public.places (
  id text primary key, -- Use a combination or uuid, keeping 'p_Date.now()' format for now if string
  user_id uuid references public.profiles(id) not null,
  lat numeric not null,
  lon numeric not null,
  name text not null,
  formatted text,
  category text,
  color text,
  visibility visibility_status default 'private'::visibility_status,
  memories jsonb default '[]'::jsonb,
  requests jsonb default '[]'::jsonb,
  approvalStatus text default 'approved',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.places enable row level security;
-- Policy: User can view their own, public ones, and we'll add friends later
drop policy if exists "View places policy" on public.places;
create policy "View places policy" on public.places for select using (
  auth.uid() = user_id OR
  visibility = 'public' OR
  (visibility = 'friends' AND exists (
    select 1 from public.friends f 
    where f.status = 'accepted' AND 
    ((f.user_id_1 = auth.uid() and f.user_id_2 = places.user_id) OR 
     (f.user_id_2 = auth.uid() and f.user_id_1 = places.user_id))
  ))
);
drop policy if exists "Insert own places" on public.places;
create policy "Insert own places" on public.places for insert with check (auth.uid() = user_id);
drop policy if exists "Update own places" on public.places;
create policy "Update own places" on public.places for update using (auth.uid() = user_id);
drop policy if exists "Delete own places" on public.places;
create policy "Delete own places" on public.places for delete using (auth.uid() = user_id);


-- 4. Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null, -- receiver
  actor_id uuid references public.profiles(id),         -- who caused it
  type text not null, -- 'friend_request', 'friend_accept', 'shared_pin'
  message text,
  is_read boolean default false,
  target_id text, -- place_id or friend_id for navigation
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;
drop policy if exists "View own notifications" on public.notifications;
create policy "View own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Update own notifications" on public.notifications;
create policy "Update own notifications" on public.notifications for update using (auth.uid() = user_id);
drop policy if exists "Insert notifications" on public.notifications;
create policy "Insert notifications" on public.notifications for insert with check (auth.uid() = actor_id); -- For simplicity
