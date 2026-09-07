-- Energy Score — database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Safe to re-run: everything is guarded with IF NOT EXISTS / DROP IF EXISTS.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  push_enabled  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- questions: the user's daily check-in categories (5 by default, editable)
--   score_labels[1] = description for score 0
--   score_labels[2] = description for score 1
--   score_labels[3] = description for score 2
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  icon          text not null default 'sun',
  score_labels  text[] not null default array['','',''],
  reminder_time time not null default '09:00',
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint questions_score_labels_len check (array_length(score_labels, 1) = 3)
);

create index if not exists questions_user_order_idx
  on public.questions (user_id, sort_order);

-- ---------------------------------------------------------------------------
-- checkins: one score per question per local calendar day
--   `local_date` is the user's own date, sent by the client, so that a
--   9:30 PM check-in never lands on the following UTC day.
-- ---------------------------------------------------------------------------
create table if not exists public.checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete cascade,
  local_date   date not null,
  score        smallint not null check (score between 0 and 2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, question_id, local_date)
);

create index if not exists checkins_user_date_idx
  on public.checkins (user_id, local_date desc);

-- ---------------------------------------------------------------------------
-- Row-level security: a user can only ever see and write their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.questions enable row level security;
alter table public.checkins  enable row level security;

drop policy if exists "own profile"   on public.profiles;
drop policy if exists "own questions" on public.questions;
drop policy if exists "own checkins"  on public.checkins;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own questions" on public.questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own checkins" on public.checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- On sign-up: create the profile and seed the 5 default check-in questions
-- (titles, score descriptions and reminder times all match the design).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.questions (user_id, title, icon, score_labels, reminder_time, sort_order)
  values
    (new.id, 'Morning readiness',    'sun',     array[
        'Groggy, hard to get out of bed',
        'Okay, took a while to wake up',
        'Refreshed and ready to go'],            '08:00', 0),
    (new.id, 'Daytime stamina',      'battery', array[
        'Drained by midday, needed to rest',
        'Steady but dipped in the afternoon',
        'Energized and focused all day'],        '13:00', 1),
    (new.id, 'Movement capacity',    'run',     array[
        'No energy for any activity',
        'Managed light movement or a short walk',
        'Full workout felt great'],              '17:00', 2),
    (new.id, 'Evening capacity',     'moon',    array[
        'Completely wiped out after dinner',
        'Some energy left for light tasks',
        'Still active and productive tonight'],  '20:00', 3),
    (new.id, 'Mental clarity & mood', 'brain',  array[
        'Foggy, low mood, hard to focus',
        'Fairly clear, mood was neutral',
        'Sharp, positive, and motivated'],       '21:30', 4);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep checkins.updated_at honest when a score is changed.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checkins_touch_updated_at on public.checkins;
create trigger checkins_touch_updated_at
  before update on public.checkins
  for each row execute function public.touch_updated_at();
