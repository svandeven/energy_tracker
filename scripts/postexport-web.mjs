/**
 * Post-processes dist/index.html after `expo export --platform web`.
 *
 * Expo Router's `+html.tsx` hook only runs for `output: "static"`. This app is
 * `output: "single"` (an SPA) because static rendering prerenders every route
 * in Node, where Supabase's storage adapter touches `window` and crashes. So
 * the document tweaks happen here instead.
 *
 * Run via `npm run build:web`.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../dist/index.html', import.meta.url);

const CSS = `
    /* Screens are laid out for a phone; pin to a phone-width column on desktop. */
    body { margin: 0; background: #E9E9EC; }
    #root {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      background: #FFFFFF;
    }
    @media (min-width: 560px) {
      #root {
        height: min(100%, 940px);
        margin-top: max(0px, calc((100vh - 940px) / 2));
        border-radius: 28px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        overflow: hidden;
      }
    }`;

const META = [
  '<meta name="theme-color" content="#6EDA8C" />',
  '<meta name="description" content="Track your daily energy in five quick check-ins." />',
].join('\n    ');

let html = readFileSync(FILE, 'utf8');

if (html.includes('energy-score-web-tweaks')) {
  console.log('dist/index.html already processed — nothing to do');
  process.exit(0);
}

// Append after Expo's own reset so these rules win without !important.
const RESET_CLOSE = '</style>';
if (!html.includes(RESET_CLOSE)) {
  console.error('could not find Expo\'s <style> block — did the export format change?');
  process.exit(1);
}
html = html.replace(
  RESET_CLOSE,
  `${RESET_CLOSE}\n    <style id="energy-score-web-tweaks">${CSS}\n    </style>`,
);
html = html.replace('</head>', `  ${META}\n  </head>`);

writeFileSync(FILE, html);
console.log('dist/index.html: injected phone-frame CSS and meta tags');
