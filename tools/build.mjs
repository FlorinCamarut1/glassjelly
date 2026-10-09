// Build: node tools/build.mjs
//  1. regenerates the refraction lens tokens in src/glassjelly.css (between /* lens:begin */ and /* lens:end */)
//  2. writes dist/glassjelly.css (everything) and dist/glassjelly-nologo.css (without the GJ-LOGO block), the files
//     the jsDelivr @import points at
//  3. checks the index.html scripts for characters File Transformation cannot carry
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { lens, bubble, bubbleCA } from './glassfilter.mjs';
import { svg as LOGO } from './logo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'glassjelly.css');
export const LENS = { rim: 8, soft: 6, scale: 40, reach: 4 };     // panels, menus, player (frosted)
export const LENS_CAP = { rim: 6, soft: 8, scale: 74, reach: 5 }; // clear capsules: a glass rod, no blur (v2.4)
export const LENS_PANEL = { rim: 10, soft: 10, scale: 70, reach: 6 }; // clear menus, dialogs, drawers, player (v2.5)
export const LENS_S = { rim: 4, soft: 3, scale: 14, reach: 3 };   // (unused since v2.2: round buttons use BUBBLE_S)
export const BUBBLE = { rim: 5, soft: 5, scale: 46, reach: 5 };   // hover droplet: pills, menu rows (dispersion)
export const BUBBLE_HS = { rim: 3, soft: 9, scale: 52, reach: 7 }; // hover droplet: round buttons 34-48 px
export const BUBBLE_S = { rim: 3, soft: 9, scale: 46, reach: 7 };            // round buttons at rest
export const BUBBLE_FAB = { rim: 4, soft: 12, scale: 70, reach: 8 }; // big play bead on a hovered poster

let css = fs.readFileSync(SRC, 'utf8');
const tokens = `/* lens:begin */\n  --gj-lens: ${lens(LENS)};\n  --gj-lens-cap: ${lens(LENS_CAP)};\n  --gj-lens-panel: ${lens(LENS_PANEL)};\n  --gj-lens-s: ${lens(BUBBLE_S)};\n  --gj-bubble: ${lens(BUBBLE)};\n  --gj-bubble-s: ${lens(BUBBLE_HS)};\n  --gj-bubble-fab: ${lens(BUBBLE_FAB)};\n  /* lens:end */`;
const re = /\/\* lens:begin \*\/[\s\S]*?\/\* lens:end \*\//;
if (!re.test(css)) throw new Error('lens markers missing in src/glassjelly.css');
css = css.replace(re, tokens);
// the logo token comes from tools/logo.mjs (also written to assets/logo/glassjelly.svg by `node tools/logo.mjs`)
const logoRe = /--gj-logo: url\("data:image\/svg\+xml,[^"]*"\);/;
if (!logoRe.test(css)) throw new Error('--gj-logo missing');
css = css.replace(logoRe, '--gj-logo: url("data:image/svg+xml,' + encodeURIComponent(LOGO.trim()).replace(/'/g, '%27') + '");');
fs.writeFileSync(SRC, css);

const version = (css.match(/--gj-version:\s*"([^"]+)"/) || [])[1];
const noLogo = css.replace(/\/\* >>> GJ-LOGO BEGIN <<<[\s\S]*?\/\* <<< GJ-LOGO END >>> \*\/[ \t]*\n?/, '');
if (noLogo === css) throw new Error('GJ-LOGO block not found');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'glassjelly.css'), css);
fs.writeFileSync(path.join(ROOT, 'dist', 'glassjelly-nologo.css'), noLogo);

for (const f of fs.readdirSync(path.join(ROOT, 'src', 'js'))) {
  const js = fs.readFileSync(path.join(ROOT, 'src', 'js', f), 'utf8');
  if (js.includes('$') || /<\/script/i.test(js)) throw new Error(`src/js/${f}: no "$" or "</script" allowed (File Transformation)`);
}
// braces must balance, or Jellyfin silently drops the rest of the stylesheet
const depth = [...css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"/g, '')].reduce((d, c) => d + (c === '{') - (c === '}'), 0);
if (depth !== 0) throw new Error(`unbalanced braces in src/glassjelly.css (${depth})`);
console.log(`glassjelly ${version}: dist/glassjelly.css ${(css.length / 1024).toFixed(1)} KB, dist/glassjelly-nologo.css ${(noLogo.length / 1024).toFixed(1)} KB`);
