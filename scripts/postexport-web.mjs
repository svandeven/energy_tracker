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
    /*
     * Screens are single-column layouts. Phones get the full width; anything
     * wider gets a full-height centered column, so desktop reads as a web page
     * rather than a phone mock-up, without stretching buttons across the screen.
     */
    body { margin: 0; background: #F0F0F0; }
    #root {
      width: 100%;
      max-width: 760px;
      height: 100%;
      margin: 0 auto;
      background: #FFFFFF;
    }
    @media (min-width: 800px) {
      #root { box-shadow: 0 0 0 1px #E6E6E8; }
    }
    /* The content admin (src/app/admin) is a desktop tool: use the full window. */
    body.sunsteps-admin #root {
      max-width: none;
      box-shadow: none;
    }`;

const META = [
  '<meta name="theme-color" content="#FE9F4D" />',
  '<meta name="description" content="Track your daily energy in five quick check-ins." />',
  // Safari on iOS shows its own "Open / Get" banner for the native app.
  '<meta name="apple-itunes-app" content="app-id=6836455569" />',
].join('\n    ');

let html = readFileSync(FILE, 'utf8');

if (html.includes('fettle-web-tweaks')) {
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
  `${RESET_CLOSE}\n    <style id="fettle-web-tweaks">${CSS}\n    </style>`,
);
html = html.replace('</head>', `  ${META}\n  </head>`);

writeFileSync(FILE, html);
console.log('dist/index.html: injected page-column CSS and meta tags');
