-- Fettle — database schema
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

-- Roles: 'content_editor' can edit app text and translations on the web admin;
-- 'super_admin' can do that and also hand out roles. Guarded by a trigger below.
alter table public.profiles
  add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'content_editor', 'super_admin'));

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

-- Reminders for questions about the evening or sleep fire the morning after,
-- and the score is logged for the day before. Answering on the day itself is
-- still allowed; it just isn't expected yet.
alter table public.questions
  add column if not exists reminder_next_day boolean not null default false;

-- One of the five seeded questions with untouched wording. While set, the app
-- shows the translated title and score descriptions for the user's language;
-- the app clears it as soon as the user rewrites the question.
alter table public.questions add column if not exists default_key text;

-- Backfill: tag existing accounts' seeded questions whose wording is unchanged.
update public.questions q
set default_key = d.key
from (values
  ('morning',  'Morning readiness',     array['Groggy, hard to get out of bed', 'Okay, took a while to wake up', 'Refreshed and ready to go']),
  ('daytime',  'Daytime stamina',       array['Drained by midday, needed to rest', 'Steady but dipped in the afternoon', 'Energized and focused all day']),
  ('movement', 'Movement capacity',     array['No energy for any activity', 'Managed light movement or a short walk', 'Full workout felt great']),
  ('evening',  'Evening capacity',      array['Completely wiped out after dinner', 'Some energy left for light tasks', 'Still active and productive tonight']),
  ('mood',     'Mental clarity & mood', array['Foggy, low mood, hard to focus', 'Fairly clear, mood was neutral', 'Sharp, positive, and motivated'])
) as d(key, title, labels)
where q.default_key is null and q.title = d.title and q.score_labels = d.labels;

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

  -- English text is the stored fallback; default_key makes the app show the
  -- user's own language instead (see src/i18n/questions.ts).
  insert into public.questions (user_id, default_key, title, icon, score_labels, reminder_time, sort_order)
  values
    (new.id, 'morning',  'Morning readiness',    'sun',     array[
        'Groggy, hard to get out of bed',
        'Okay, took a while to wake up',
        'Refreshed and ready to go'],            '08:00', 0),
    (new.id, 'daytime',  'Daytime stamina',      'battery', array[
        'Drained by midday, needed to rest',
        'Steady but dipped in the afternoon',
        'Energized and focused all day'],        '13:00', 1),
    (new.id, 'movement', 'Movement capacity',    'run',     array[
        'No energy for any activity',
        'Managed light movement or a short walk',
        'Full workout felt great'],              '17:00', 2),
    (new.id, 'evening',  'Evening capacity',     'moon',    array[
        'Completely wiped out after dinner',
        'Some energy left for light tasks',
        'Still active and productive tonight'],  '20:00', 3),
    (new.id, 'mood',     'Mental clarity & mood', 'brain',  array[
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

-- ---------------------------------------------------------------------------
-- Account deletion (required by App Store guideline 5.1.1(v)).
-- Deleting the auth.users row cascades to profiles, questions and checkins.
-- Clients cannot touch the auth schema, so this runs as its owner; it can only
-- ever delete the caller, because the id comes from the verified JWT.
-- ---------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

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

-- ---------------------------------------------------------------------------
-- Roles
--   Nobody can promote themselves: only a super admin can change `role`, and
--   never their own (so there is always at least one left). The very first
--   super admin is set by hand in the SQL editor, where auth.uid() is null —
--   see "Content admin" in README.md.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('content_editor', 'super_admin')
  );
$$;

revoke execute on function public.is_super_admin() from public, anon;
revoke execute on function public.is_content_editor() from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_content_editor() to authenticated;

-- The "own profile" policy lets users write their own row, so the role column
-- needs its own guard. Requests from the app always carry a user id; the SQL
-- editor and the sign-up trigger do not, which is what lets them through.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' and new.role <> 'user' then
    raise exception 'New profiles start as role user';
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if not public.is_super_admin() then
      raise exception 'Only a super admin can change roles';
    end if;
    if new.id = auth.uid() then
      raise exception 'You cannot change your own role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- Super admins list users (with email, which lives in auth.users) ...
create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, role text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can list users';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.role, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by (p.role = 'user'), u.email;
end;
$$;

-- ... and set roles. The guard trigger above re-checks all of this.
create or replace function public.admin_set_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can change roles';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  update public.profiles set role = new_role where id = target;
  if not found then
    raise exception 'No such user';
  end if;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- translations: editor overrides of the app's built-in text (src/i18n/*.ts).
--   Only changed strings are stored; everything else uses the bundled text.
--   Readable by everyone, signed in or not, because the welcome and sign-in
--   screens need it too. Only content editors and super admins can write.
-- ---------------------------------------------------------------------------
create table if not exists public.translations (
  key         text not null,
  locale      text not null check (locale in ('en', 'nl')),
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null default auth.uid(),
  primary key (key, locale)
);

alter table public.translations enable row level security;

drop policy if exists "anyone reads translations" on public.translations;
drop policy if exists "editors write translations" on public.translations;

create policy "anyone reads translations" on public.translations
  for select using (true);

create policy "editors write translations" on public.translations
  for all to authenticated
  using (public.is_content_editor())
  with check (public.is_content_editor());

grant select on public.translations to anon, authenticated;
grant insert, update, delete on public.translations to authenticated;

create or replace function public.touch_translation()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists translations_touch on public.translations;
create trigger translations_touch
  before insert or update on public.translations
  for each row execute function public.touch_translation();

-- ---------------------------------------------------------------------------
-- Daily goals
--   goal_templates: goals the user keeps — repeating defaults ('daily' or
--     'weekdays') and saved goals ('none') to pick again from a list.
--   goals: one row per goal per local day. Repeating templates are copied in
--     by the app the first time it sees a day (one copy per template per day,
--     enforced below). `done_at` set = ticked off. `hidden` = removed for that
--     day only, so a repeating goal isn't copied back in.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists goal_plan_time time not null default '07:30';
alter table public.profiles
  add column if not exists goal_review_time time not null default '20:30';

create table if not exists public.goal_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 200),
  repeat      text not null default 'none' check (repeat in ('none', 'daily', 'weekdays')),
  remind_at   time,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists goal_templates_user_idx
  on public.goal_templates (user_id, sort_order);

create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  local_date   date not null,
  template_id  uuid references public.goal_templates (id) on delete set null,
  title        text not null check (length(btrim(title)) between 1 and 200),
  remind_at    time,
  done_at      timestamptz,
  hidden       boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  -- NULL template ids never collide, so one-off goals are unaffected.
  unique (user_id, template_id, local_date)
);

create index if not exists goals_user_date_idx
  on public.goals (user_id, local_date desc);

alter table public.goal_templates enable row level security;
alter table public.goals          enable row level security;

drop policy if exists "own goal templates" on public.goal_templates;
drop policy if exists "own goals"          on public.goals;

create policy "own goal templates" on public.goal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-day totals for the progress chart, streaks and awards, over the user's
-- whole history (small: one row per day). Runs as the caller, so RLS applies.
create or replace function public.goal_day_stats()
returns table (local_date date, total integer, done integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select g.local_date, count(*)::integer, count(g.done_at)::integer
  from public.goals g
  where g.user_id = auth.uid() and not g.hidden
  group by g.local_date
  order by g.local_date;
$$;

revoke execute on function public.goal_day_stats() from public, anon;
grant execute on function public.goal_day_stats() to authenticated;
