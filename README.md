# Sun Steps

Ships as **Sun Steps**, and as **Lekker Bezig** on devices set to Dutch (`locales/nl.json`).

A React Native (Expo) app for tracking daily energy across five quick check-ins,
built from a design mockup that is kept locally and deliberately not committed
(`design/` is gitignored).

**Web version: https://sunsteps.eu**

Each of the five categories is scored **0, 1 or 2** once per day, so a full day
totals **/10**. Add or remove categories in Settings and the denominator follows.

## Screens

| Mockup | Route | File |
| --- | --- | --- |
| Welcome | `/welcome` | `src/app/(auth)/welcome.tsx` |
| Log in / Create account | `/sign-in` | `src/app/(auth)/sign-in.tsx` |
| Home | `/` | `src/app/(tabs)/index.tsx` |
| Energy check-in (tab) | `/checkin` | `src/app/(tabs)/checkin.tsx` |
| Daily goals (tab) | `/goals` | `src/app/(tabs)/goals.tsx` |
| Add goal | `/goal/new` | `src/app/goal/new.tsx` |
| Reminders | `/reminders` | `src/app/reminders.tsx` |
| Goal progress (tab) | `/progress` | `src/app/(tabs)/progress.tsx` |
| Awards (tab) | `/awards` | `src/app/(tabs)/awards.tsx` |
| Category check-in | `/check-in/[id]` | `src/app/check-in/[id].tsx` |
| Today's summary | `/summary` | `src/app/summary.tsx` |
| History (from Progress) | `/history` | `src/app/(tabs)/history.tsx` |
| Settings (profile button on Home) | `/settings` | `src/app/(tabs)/settings.tsx` |
| Profile (photo, display name) | `/profile` | `src/app/profile.tsx` |
| Daily questions (wording, order, reminder times, push switch) | `/questions` | `src/app/questions.tsx` |

Plus five screens with no mockup of their own, following the same visual language:

| Screen | Route | File |
| --- | --- | --- |
| Forgot password | `/forgot-password` | `src/app/(auth)/forgot-password.tsx` |
| Set new password | `/reset-password` | `src/app/(auth)/reset-password.tsx` |
| Change password | `/change-password` | `src/app/change-password.tsx` |
| Delete account | `/delete-account` | `src/app/delete-account.tsx` |
| Terms & Privacy | `/terms` | `src/app/terms.tsx` |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `profiles`, `questions` and `checkins` tables, the row-level security
   policies, and a sign-up trigger that seeds the five default questions with
   the exact titles, score descriptions and reminder times from the design.
3. Copy `.env.example` to `.env` and fill in the two values from
   **Project Settings → API**:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon / publishable key>
   ```

   The anon key is a *publishable* key — it is meant to ship inside a mobile
   bundle, and everything it can reach is fenced off by the RLS policies in
   `schema.sql`. Never put the `service_role` key in this file. `.env` is
   gitignored.

Until `.env` is filled in the app shows a setup checklist instead of the
welcome screen.

### 3. Run it

```bash
npx expo start
```

Scan the QR code with **Expo Go**. Email/password sign-up, all five screens,
the History chart and local reminder notifications work in Expo Go.

### 4. Verify the backend

```bash
npm run verify:backend
```

Checks that `.env` holds real (non-placeholder) values, that the key is a
publishable one rather than `service_role`, that all three tables exist with RLS
refusing anonymous reads, and whether email confirmation will block your first
login. Prints status only — never key values.

## Password reset and change

**Change password** (signed in) is at Settings → Account → Change password. It
re-authenticates with the current password before calling `updateUser`, which
does not require the old password on its own. Works with no extra configuration.

**Password reset** (signed out) is behind "Forgot password?" on the log in tab.
It emails both a recovery link and a 6-digit code; either gets you to the
new-password screen. Two Supabase settings are required:

1. **Authentication → Email Templates → Reset Password** — the default contains
   only `{{ .ConfirmationURL }}`. Add the code so the in-app field has something
   to accept:

   ```html
   <p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
   ```

2. **Authentication → URL Configuration → Redirect URLs** — add
   `sunsteps://reset-password`, plus the `exp://…/--/reset-password` variant
   for Expo Go.

In Expo Go the redirect is an `exp://` URL that changes every session, so the
link path is unreliable there and the 6-digit code is the one that works.

## Account deletion and terms

**Delete account** is at Settings → Account → Delete account, as App Store
guideline 5.1.1(v) requires. Password accounts re-enter their password; every
account types `DELETE` (`VERWIJDER` in Dutch) to confirm. The app calls the `delete_account()` RPC in
`supabase/schema.sql`, a `security definer` function that deletes the caller's
`auth.users` row (the id comes from the JWT, so it can never delete anyone
else). Profiles, questions and check-ins go with it via `on delete cascade`.
If your project predates this function, re-run that block of the schema in the
SQL editor, or deletion fails with "Could not find the function".

**Terms & Privacy** (`/terms`) is linked from the sign-in footer and from
Settings, and opens signed out too. `CONTACT_EMAIL` in `src/app/terms.tsx` is
support@sunsteps.eu; have the text reviewed before you submit. App Store
Connect also wants the privacy policy at a public URL — `/terms` on the web
build (eventually `https://sunsteps.eu/terms`).

## Languages and content admin

The app is in **English and Dutch**. It follows the phone's language (or the
browser's, on web) and falls back to English. People can override that in
Settings → Language, or with the EN | NL switch on the welcome screen; the
choice is stored on the device.

All on-screen text lives in `src/i18n/en.ts` and `src/i18n/nl.ts` (the Dutch
file is type-checked against the English keys, so a missing translation fails
`tsc`). The five default check-in questions follow the language too, until a
user rewrites one — then it's theirs and stays as typed (`questions.default_key`).

**Editing text without a release.** Content editors and super admins get a
**Content admin** link in Settings on the web, which opens `/admin`:

- **Text & translations**: every string, English and Dutch side by side,
  searchable and grouped by screen. Saving writes an override to the
  `translations` table; apps pick it up on next launch. "Reset to built-in"
  deletes the override.
- **Users & roles** (super admins only): make someone a content editor or a
  super admin. Nobody can change their own role, so a super admin always remains.

Roles are enforced in the database (`guard_profile_role` trigger, RLS on
`translations`), not just in the UI. To create the **first super admin**, sign
up in the app, then run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'super_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Adding a third language: add it to `LOCALES` in `src/i18n/index.tsx`, write its
bundle, widen the `locale` check on `translations` in `schema.sql`, and add it to
`supportedLocales` in `app.json`.

## Deploying the web version

```bash
npm run deploy:web               # build:web, then wrangler deploy
```

Live at **https://sunsteps.eu**, served as the Cloudflare Worker `sunsteps`
(`wrangler.jsonc`; also at `sunsteps.susan-vandeven.workers.dev`).
`worker/index.js` 301-redirects `www.sunsteps.eu`, `fettle-life.com` and
`www.fettle-life.com` to `sunsteps.eu`, keeping the path. The first `wrangler` run opens a browser
to log in to Cloudflare. The domains are registered at GoDaddy with their nameservers pointed
at Cloudflare; `lekkerbezig.eu` redirects via a Cloudflare
Redirect Rule. Supabase's Site URL is `https://sunsteps.eu`, and
`https://sunsteps.eu/**` must stay in its Redirect URLs, or web sign-in and
password recovery break.

`npm run build:web` runs `expo export --platform web` and then
`scripts/postexport-web.mjs`, which injects the centred page column (full width on phones, up to 760px on
desktop),
`theme-color` and description into `dist/index.html`. That indirection exists
because Expo Router's `+html.tsx` hook only runs for `output: "static"`, and
this app uses `output: "single"` — static rendering prerenders every route in
Node, where Supabase's storage adapter touches `window` and crashes.

`dist/` is gitignored. `wrangler.jsonc` sets `not_found_handling` to
`single-page-application`, so deep links like `/terms` serve `index.html`. The old EAS Hosting site (`energy-score.expo.app`) is no longer the
primary; EAS Hosting's free tier has no custom domain support.

On web, notifications and haptics silently no-op, and the reminder time picker
falls back to the browser's `<input type="time">`
(`src/components/TimePicker.web.tsx`).

⚠️ A public URL plus disabled email confirmation means anyone can register
accounts in your Supabase project. Enable **Authentication → Sign In / Providers
→ Email → Confirm email** before sharing the link.

## Google and Apple sign-in

Email/password works as soon as the schema is applied. The social buttons use
Supabase's OAuth flow through an in-app browser, which needs two extra steps:

1. **Enable the provider** in Supabase under **Authentication → Providers**
   (Google needs a Google Cloud OAuth client; Apple needs an Apple Services ID).
2. **Allowlist the redirect URLs** under **Authentication → URL Configuration →
   Redirect URLs**. Add both:
   - `sunsteps://auth-callback` — dev builds and production
   - `exp://127.0.0.1:8081/--/auth-callback` — Expo Go (swap in the LAN IP that
     `npx expo start` prints if you are on a device rather than the simulator)

Without the Expo Go entry the browser sheet will open, authenticate, and then
fail to hand the session back.

By default Supabase also requires **email confirmation** on sign-up. Either
click the emailed link, or turn confirmations off under **Authentication →
Sign In / Providers → Email** while developing.

## Daily goals

Goals live in two tables (`supabase/schema.sql`): `goal_templates` holds the
goals people keep — repeating ones (`daily` / `weekdays`, shown as "Default
goal") and saved ones (`none`, the chips on Add goal) — and `goals` holds one
row per goal per day. The app copies repeating goals onto a day the first time
it loads that day (`ensureGoalsForDate`); a unique key makes that safe to run
twice. Removing a repeating goal "from today" hides that day's row instead of
deleting it, so it isn't copied back.

The rules for progress and awards are in `src/lib/goals.ts`:

- A day **counts** only if it had goals, and is **met** when every goal on it
  is ticked off. Days without goals neither break nor extend a streak, and an
  unfinished today doesn't break it either.
- The **7 day average** is the mean completion rate over the last 7 days that
  had goals.
- **Awards:** First full day (one met day), Weekly goal getter (7 met days in
  a row, earned again every 7), Monthly goals (30 met days in total, any
  order, again every 30), 100 day streak (100 in a row).
- `goal_day_stats()` returns one row per day over the whole history, so the
  monthly and 100-day awards don't need every goal row loaded.

## Notifications

`src/features/notifications.ts` schedules, all as local notifications:

- one daily reminder per energy question, at its reminder time;
- the morning "Plan your day" and evening "How did today go?" goal nudges, at
  the times on the Reminders screen (`profiles.goal_plan_time` /
  `goal_review_time`);
- a reminder for each goal with a time, carrying a **Done** button. Repeating
  goals are scheduled a week ahead, one day at a time, and re-planned whenever
  the app opens, so a goal already ticked off doesn't still nag.

`src/features/useReminderSync.ts` re-schedules whenever any of that, the push
toggle or the language changes. Tapping a reminder opens the matching screen
(`useNotificationResponses`).

**The Done button:** on Android it ticks the goal off in the background, via
the task in `src/features/goalNotificationTask.ts` (loaded first by
`index.ts`). On iPhone, iOS only lets the app's code run for a button tap if
the app opens or is still in memory, so Done briefly opens the app and ticks it
there. iPhone notifications appear on a paired Apple Watch with the same
button. The task needs `expo-task-manager`, so test it in a development build;
Expo Go won't run it.

Local notifications fire in Expo Go. Remote push is not wired up and would need
a development build.

## Project layout

```
src/
  app/                 expo-router routes (see the table above)
  components/          Text, Button, Card, CategoryIcon, AppHeader, EnergyChart,
                       TimePicker (+ .web variant)
  providers/           AuthProvider (Supabase auth), DataProvider (questions + check-ins),
                       GoalsProvider (goals, saved goals, per-day stats)
  i18n/                en/nl strings, I18nProvider (t(), language choice, date formats)
  lib/
    scoring.ts         daily totals, 7-day rolling average, week-over-week delta
    goals.ts           goal streaks, completion rates and awards
    dates.ts           local-calendar-date helpers ('YYYY-MM-DD', never UTC)
    database.types.ts  hand-written types matching supabase/schema.sql
  theme/               design tokens sampled from the mockup
  features/            default questions, goal writes, notification scheduling
                       and the Done-button handlers
scripts/
  verify-backend.mjs   checks .env against the live project
  postexport-web.mjs   post-processes dist/index.html after a web export
supabase/schema.sql    run once in the Supabase SQL editor
```

### Notes on the implementation

- **Colors** in `src/theme/index.ts` come from the app icon (`#FE9F4D`
  orange, `#FFDC4A` yellow), plus a deeper `#B5560A` orange for links and
  small icons, which stays readable on white.
- **Font** is [Figtree](https://fonts.google.com/specimen/Figtree), a free
  stand-in for the mockup's geometric sans. Swap the `@expo-google-fonts`
  package in `src/theme/fonts.ts` to change it.
- **Dates are local, not UTC.** A 9:30 PM "Mental clarity" check-in has to land
  on that evening's day, so `checkins.local_date` is a `date` the client
  computes in the device's own timezone.
- **Missing days are not zeros.** Averages and the chart skip days with no
  check-ins rather than treating them as a score of 0, so the trend line breaks
  instead of dipping.
- **Deleting a question is a soft delete** (`is_active = false`) so past
  check-ins stay meaningful in History.
- **The check-in flow chains.** Saving a score jumps to the next unanswered
  category, and to the summary after the last one — the mockup's "Category 5 of
  5" flow.
- **Past days can be backfilled.** History lists every day in the window, not
  only logged ones; missing days get an "Add" affordance and tapping any row
  opens that date's check-in flow. Bounded to `HISTORY_WINDOW_DAYS` (45) because
  the screens only hold check-ins from inside that window — logging an older day
  would upsert against data that was never loaded and could overwrite a real
  score. Malformed, future, or out-of-range dates fall back to today.
- **Password recovery state is tracked explicitly**, not inferred from an auth
  event: the PKCE code exchange reports a plain sign-in, so there is no reliable
  `PASSWORD_RECOVERY` signal. The auth gate checks that flag before the normal
  signed-in redirect, since a recovery session is authenticated but still owes a
  new password.
- The dashboard mockup shows `6/10` above scores of 2+1+2; the summary mockup's
  `8/10` matches its own 2+1+2+1+2. Totals here are always computed from the
  scores, so the dashboard sums to 5 in that state.
