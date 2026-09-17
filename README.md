# Energy Score

A React Native (Expo) app for tracking daily energy across five quick check-ins,
built from a design mockup that is kept locally and deliberately not committed
(`design/` is gitignored).

**Web version: https://energy-score.expo.app**

Each of the five categories is scored **0, 1 or 2** once per day, so a full day
totals **/10**. Add or remove categories in Settings and the denominator follows.

## Screens

| Mockup | Route | File |
| --- | --- | --- |
| Welcome | `/welcome` | `src/app/(auth)/welcome.tsx` |
| Log in / Create account | `/sign-in` | `src/app/(auth)/sign-in.tsx` |
| Dashboard | `/` | `src/app/(tabs)/index.tsx` |
| Category check-in | `/check-in/[id]` | `src/app/check-in/[id].tsx` |
| Today's summary | `/summary` | `src/app/summary.tsx` |
| History | `/history` | `src/app/(tabs)/history.tsx` |
| Settings | `/settings` | `src/app/(tabs)/settings.tsx` |

Plus three screens with no mockup of their own, following the same visual language:

| Screen | Route | File |
| --- | --- | --- |
| Forgot password | `/forgot-password` | `src/app/(auth)/forgot-password.tsx` |
| Set new password | `/reset-password` | `src/app/(auth)/reset-password.tsx` |
| Change password | `/change-password` | `src/app/change-password.tsx` |

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
   `energyscore://reset-password`, plus the `exp://…/--/reset-password` variant
   for Expo Go.

In Expo Go the redirect is an `exp://` URL that changes every session, so the
link path is unreliable there and the 6-digit code is the one that works.

## Deploying the web version

```bash
npm run build:web                # export to dist/ + inject document tweaks
npx eas-cli deploy --prod        # publish to EAS Hosting
```

Live at **https://energy-score.expo.app**.

`npm run build:web` runs `expo export --platform web` and then
`scripts/postexport-web.mjs`, which injects the phone-width centred frame,
`theme-color` and description into `dist/index.html`. That indirection exists
because Expo Router's `+html.tsx` hook only runs for `output: "static"`, and
this app uses `output: "single"` — static rendering prerenders every route in
Node, where Supabase's storage adapter touches `window` and crashes.

`dist/` is gitignored. The EAS Hosting free tier covers 100k requests/month,
1 GB storage and 7 days of log retention, with **no custom domain support** —
the same `dist/` deploys to Cloudflare Pages or Vercel if you need one.

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
   - `energyscore://auth-callback` — dev builds and production
   - `exp://127.0.0.1:8081/--/auth-callback` — Expo Go (swap in the LAN IP that
     `npx expo start` prints if you are on a device rather than the simulator)

Without the Expo Go entry the browser sheet will open, authenticate, and then
fail to hand the session back.

By default Supabase also requires **email confirmation** on sign-up. Either
click the emailed link, or turn confirmations off under **Authentication →
Sign In / Providers → Email** while developing.

## Notifications

Settings schedules one repeating daily local notification per question, at that
question's reminder time. `src/features/useReminderSync.ts` re-schedules
whenever a time, title or the push toggle changes.

Local notifications fire in Expo Go. Remote push is not wired up and would need
a development build.

## Project layout

```
src/
  app/                 expo-router routes (see the table above)
  components/          Text, Button, Card, CategoryIcon, AppHeader, EnergyChart,
                       TimePicker (+ .web variant)
  providers/           AuthProvider (Supabase auth), DataProvider (questions + check-ins)
  lib/
    scoring.ts         daily totals, 7-day rolling average, week-over-week delta
    dates.ts           local-calendar-date helpers ('YYYY-MM-DD', never UTC)
    database.types.ts  hand-written types matching supabase/schema.sql
  theme/               design tokens sampled from the mockup
  features/            default questions, notification scheduling
scripts/
  verify-backend.mjs   checks .env against the live project
  postexport-web.mjs   post-processes dist/index.html after a web export
supabase/schema.sql    run once in the Supabase SQL editor
```

### Notes on the implementation

- **Colors** in `src/theme/index.ts` are the exact hex values sampled from the
  mockup pixels (`#6EDA8C` green, `#B7FACC` mint, `#35D6C0` teal, `#FFDD33`
  yellow, `#1C1C1E` ink, `#F0F0F0` surface).
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
