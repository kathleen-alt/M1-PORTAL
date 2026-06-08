// Build a single self-contained, offline HTML of the platform that runs entirely
// in Demo mode (no server, no API key) — handy for sharing an interactive demo.
//
// Run after `npm run build`:  node scripts/build-standalone.mjs
// or simply:                  npm run build:standalone
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'client', 'dist');
const out = path.join(root, 'm1-prospecting-demo.html');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('client/dist not found — run `npm run build` first.');
  process.exit(1);
}

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const read = (rel) => fs.readFileSync(path.join(dist, rel), 'utf8');
// Function-form replacements avoid String.replace's special `$` handling
// (the minified bundle is full of `$`).
const repl = (s) => () => s;

// Resolve the hashed asset names straight from the built HTML.
const jsRef = html.match(/<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/i);
const cssRef = html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/i);
if (!jsRef || !cssRef) { console.error('Could not find built asset references.'); process.exit(1); }

const css = read(jsRef ? cssRef[1].replace(/^\//, '') : '');
let js = read(jsRef[1].replace(/^\//, '')).replace(/<\/script/gi, '<\\/script');
const favicon = fs.existsSync(path.join(dist, 'favicon.svg')) ? read('favicon.svg') : '';

html = html.replace(/<link rel="stylesheet"[^>]*>/i, repl(`<style>${css}</style>`));
if (favicon) {
  html = html.replace(/<link rel="icon"[^>]*>/i,
    repl(`<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}">`));
}
html = html.replace(/<script[^>]*src="[^"]+\.js"[^>]*><\/script>/i,
  repl(`<script>window.__M1_FORCE_DEMO__=true;</scr` + `ipt><script type="module">${js}</scr` + `ipt>`));

fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)}KB) — open it in any browser.`);
