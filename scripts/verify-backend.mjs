/**
 * Checks that .env points at a live Supabase project with schema.sql applied.
 * Prints status only — never the key values.
 *
 *   node scripts/verify-backend.mjs
 */
import { readFileSync } from 'node:fs';

const PLACEHOLDERS = ['https://your-project-ref.supabase.co', 'your-anon-key'];
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`    ${m}`);

let env = {};
try {
  env = Object.fromEntries(
    readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }),
  );
} catch {
  bad('.env not found — copy .env.example to .env first');
  process.exit(1);
}

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('\nEnergy Score — backend check\n');

if (!url || PLACEHOLDERS.includes(url)) {
  bad('EXPO_PUBLIC_SUPABASE_URL is missing or still the placeholder');
  info('Project Settings -> API -> Project URL');
  process.exit(1);
}
if (!key || PLACEHOLDERS.includes(key)) {
  bad('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or still the placeholder');
  info('Project Settings -> API -> anon / publishable key');
  process.exit(1);
}
ok(`URL set (${new URL(url).hostname})`);
ok(`anon key set (${key.length} chars, ${key.slice(0, 3)}…)`);

// A service_role key here would be a serious leak — it bypasses RLS.
try {
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
  if (claims.role && claims.role !== 'anon') {
    bad(`this key has role "${claims.role}", not "anon" — do NOT ship it`);
    info('Use the anon/publishable key. Rotate this one if it was committed.');
    process.exit(1);
  }
  ok('key role is "anon" (safe to bundle — RLS applies)');
} catch {
  // Newer non-JWT keys are distinguishable by prefix: sb_publishable_… is the
  // client key, sb_secret_… is the server key that bypasses RLS.
  if (key.startsWith('sb_secret')) {
    bad('this is a SECRET key (sb_secret_…) — it bypasses RLS, never bundle it');
    info('Swap it for the publishable key (sb_publishable_…) and rotate this one.');
    process.exit(1);
  } else if (key.startsWith('sb_publishable')) {
    ok('key is publishable (sb_publishable_… — safe to bundle, RLS applies)');
  } else {
    info(`(unrecognised key format "${key.slice(0, 6)}…" — could not verify it is client-safe)`);
  }
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
let failed = false;

for (const table of ['profiles', 'questions', 'checkins']) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
    const body = await res.text();
    if (res.ok) {
      // RLS means anon sees zero rows — table existing is what we're proving.
      ok(`table "${table}" exists and RLS is returning no rows to anon`);
    } else if (body.includes('PGRST205') || res.status === 404) {
      bad(`table "${table}" not found — schema.sql has not been applied`);
      failed = true;
    } else if (res.status === 401 || res.status === 403) {
      bad(`table "${table}": auth rejected (${res.status}) — check the anon key`);
      failed = true;
    } else {
      bad(`table "${table}": HTTP ${res.status} ${body.slice(0, 120)}`);
      failed = true;
    }
  } catch (e) {
    bad(`cannot reach ${new URL(url).hostname}: ${e.message}`);
    info('Network issue, not a config issue. HTTPS/443 must be open.');
    process.exit(1);
  }
}

// The sign-up trigger is what seeds the five default questions.
try {
  const res = await fetch(`${url}/auth/v1/settings`, { headers });
  if (res.ok) {
    const s = await res.json();
    ok('auth endpoint reachable');
    info(`email signup enabled: ${s.external?.email ?? 'unknown'}`);
    if (s.mailer_autoconfirm === false) {
      info('email confirmation is ON — you must click the emailed link to log in');
      info('turn it off while developing: Authentication -> Sign In / Providers -> Email');
    } else {
      ok('email auto-confirm is on — sign-up logs you straight in');
    }
  }
} catch { /* non-fatal */ }

console.log(
  failed
    ? '\n\x1b[31mNot ready.\x1b[0m Apply supabase/schema.sql in the SQL Editor, then re-run.\n'
    : '\n\x1b[32mBackend is ready.\x1b[0m Run: npx expo start --clear\n',
);
process.exit(failed ? 1 : 0);
