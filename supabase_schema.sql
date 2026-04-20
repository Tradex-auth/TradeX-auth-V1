-- Supabase Migration: TradeX
-- Migration from Clerk to Supabase Auth + Admin Panel Support

-- 0. Clean up existing tables to avoid "already exists" errors
drop table if exists public.milestones cascade;
drop table if exists public.rule_violations cascade;
drop table if exists public.watchlist_logs cascade;
drop table if exists public.daily_logs cascade;
drop table if exists public.watchlists cascade;
drop table if exists public.trading_rules cascade;
drop table if exists public.deep_work_sessions cascade;
drop table if exists public.goals cascade;
drop table if exists public.trades cascade;
drop table if exists public.repository_links cascade;
drop table if exists public.morning_briefings cascade;
drop table if exists public.ai_pattern_insights cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  name text,
  role text check (role in ('admin', 'user')) default 'user',
  is_approved boolean default true, -- Default to true for this use case
  google_doc_url text,
  google_connected boolean default false,
  google_refresh_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Daily Logs (Update to reference profiles)
create table public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  clerk_user_id text, -- Keep for legacy or temporary reference
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  day_of_week text,
  achievements text,
  plans_for_tomorrow text,
  motivation_score smallint default 5,
  mood_score smallint default 5,
  happiness_score smallint default 5,
  energy_score smallint default 5,
  sleep_hours decimal default 0,
  steps_count integer default 0,
  workout_hours decimal default 0,
  gratitude_note text,
  ai_reflection text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

alter table public.daily_logs enable row level security;

-- 3. Watchlists
create table public.watchlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  symbol text not null,
  bias text check (bias in ('bullish', 'neutral', 'bearish')) default 'neutral',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, symbol)
);

alter table public.watchlists enable row level security;

-- 4. Watchlist Logs
create table public.watchlist_logs (
  id uuid default gen_random_uuid() primary key,
  watchlist_item_id uuid references public.watchlists on delete cascade not null,
  date date not null,
  bias text check (bias in ('bullish', 'neutral', 'bearish')),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (watchlist_item_id, date)
);

alter table public.watchlist_logs enable row level security;

-- 5. Trading Rules
create table public.trading_rules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('entry', 'exit', 'risk', 'mindset', 'self', 'learning', 'routine')) default 'self',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.trading_rules enable row level security;

-- 6. Rule Violations
create table public.rule_violations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  rule_id uuid references public.trading_rules on delete cascade not null,
  date date not null,
  was_followed boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, rule_id, date)
);

alter table public.rule_violations enable row level security;

-- 7. Deep Work Sessions
create table public.deep_work_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  label text,
  duration_minutes integer not null,
  focus_rating smallint check (focus_rating between 1 and 5),
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.deep_work_sessions enable row level security;

-- 8. Goals & Milestones
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('trading', 'health', 'learning', 'finance', 'other')) default 'other',
  target_date date,
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.goals enable row level security;

create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.goals on delete cascade not null,
  title text not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.milestones enable row level security;

-- 9. Trades
create table public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  symbol text not null,
  date timestamp with time zone not null,
  direction text check (direction in ('long', 'short')),
  entry_price decimal not null,
  exit_price decimal,
  quantity decimal,
  pnl decimal,
  r_multiple decimal,
  notes text,
  setup text,
  screenshot_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.trades enable row level security;

-- 10. Repository Links
create table public.repository_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  url text not null,
  category text check (category in ('Youtube', 'Github', 'Docs', 'News', 'Other')) default 'Other',
  note text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.repository_links enable row level security;

-- 11. Morning Briefings
create table public.morning_briefings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

alter table public.morning_briefings enable row level security;

-- 12. AI Pattern Insights
create table public.ai_pattern_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  high_performance_pattern text,
  violation_analysis text,
  recommendation text,
  insight_type text check (insight_type in ('success', 'warning', 'info')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_pattern_insights enable row level security;

-- Security Policies: Admin & User Isolation
-- This function checks if a user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Generic CRUD policies for all tables (Isolation + Admin Access)
do $$
declare
  t text;
  tables text[] := array['daily_logs', 'watchlists', 'trading_rules', 'rule_violations', 'deep_work_sessions', 'goals', 'trades', 'repository_links', 'morning_briefings', 'ai_pattern_insights'];
begin
  foreach t in array tables
  loop
    execute format('create policy "Users manage own %I" on public.%I for all using (auth.uid() = user_id or is_admin());', t, t);
  end loop;
end $$;

create table public.daily_system_content (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  quote text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.daily_system_content enable row level security;
create policy "Anyone can read daily content" on public.daily_system_content for select using (true);

-- Milestones policy (Nested relations)
create policy "Users manage own milestones" on public.milestones
  for all using (
    exists (
      select 1 from public.goals
      where goals.id = goal_id
      and (goals.user_id = auth.uid() or is_admin())
    )
  );

-- Watchlist logs policy
create policy "Users manage own watchlist_logs" on public.watchlist_logs
  for all using (
    exists (
      select 1 from public.watchlists
      where watchlists.id = watchlist_item_id
      and (watchlists.user_id = auth.uid() or is_admin())
    )
  );

-- Trigger for profile creation on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case 
      when new.email = 'tradex.auth@gmail.com' then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
