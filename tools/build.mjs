// Build: node tools/build.mjs
//  1. regenerates the refraction lens tokens in src/glassjelly.css (between /* lens:begin */ and /* lens:end */)
//  2. writes dist/glassjelly.css (everything) and dist/glassjelly-nologo.css (without the GJ-LOGO block), the files
//     the jsDelivr @import points at
//  3. checks the index.html scripts for characters File Transformation cannot carry
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dome as lens } from './glassfilter.mjs';   // v2.7: every lens token is a dome lens
import { svg as LOGO } from './logo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'glassjelly.css');
// dome(): band = width of the curved rim, dir = blur of the normal field, p = how sharply it curves at the very edge,
// scale = displacement in px at the edge (x .5). Keep band below half the element height (a 44px capsule: <= 16).
export const LENS = { band: 16, dir: 8, p: 2, scale: 52 };          // frosted capsules / search pill / login buttons
export const LENS_CAP = { band: 14, dir: 7, p: 2, scale: 50 };      // clear capsules (header, library toolbar)
export const LENS_PANEL = { band: 40, dir: 18, p: 2.2, scale: 110 }; // menus, dialogs, drawers, player panel
export const BUBBLE = { band: 12, dir: 6, p: 2, scale: 42 };        // hover droplet: pills, menu rows
export const BUBBLE_HS = { band: 22, dir: 9, p: 1.8, scale: 64 };   // hover droplet: round buttons 34-48 px
export const BUBBLE_S = { band: 22, dir: 9, p: 1.8, scale: 62 };    // round buttons at rest
export const BUBBLE_FAB = { band: 26, dir: 10, p: 1.8, scale: 82 }; // big play bead on a hovered poster

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
