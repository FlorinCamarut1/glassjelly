// GlassJelly logo: the Jellyfin triangle as a slab of clear glass with a drop of light (white -> icy silver "jelly")
// inside - monochrome like the rest of the theme (graphite + white). node tools/logo.mjs -> assets/logo/glassjelly.svg (the build turns it into --gj-logo).
// viewBox 64 x 56 like the v1 logo, so every place that sizes --gj-logo keeps working.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const f = n => +n.toFixed(2);
// polygon with rounded corners: each corner becomes a quadratic curve that starts r before it and ends r after it
function rounded(pts, r) {
  const n = pts.length, seg = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const s = [p[0] + (a[0] - p[0]) * r / da, p[1] + (a[1] - p[1]) * r / da];
    const e = [p[0] + (b[0] - p[0]) * r / db, p[1] + (b[1] - p[1]) * r / db];
    seg.push((i ? 'L' : 'M') + f(s[0]) + ' ' + f(s[1]) + ' Q' + f(p[0]) + ' ' + f(p[1]) + ' ' + f(e[0]) + ' ' + f(e[1]));
  }
  return seg.join(' ') + ' Z';
}
const outer = rounded([[32, 1.5], [62.5, 54.5], [1.5, 54.5]], 7.5);
const core = rounded([[32, 22], [46.5, 46], [17.5, 46]], 4.2);

export const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 56" width="64" height="56">
<defs>
<linearGradient id="j" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#aeb8c8"/><stop offset=".55" stop-color="#e9eef6"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
<linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".75"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="c" cx=".5" cy=".85" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".7"/></filter>
<filter id="h" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<path d="${outer}" fill="url(#j)" opacity=".16"/>
<path d="${outer}" fill="url(#b)"/>
<path d="${core}" fill="#fff" filter="url(#h)" opacity=".55"/>
<path d="${core}" fill="url(#j)"/>
<path d="${core}" fill="url(#g)" opacity=".45"/>
<ellipse cx="32" cy="49.5" rx="14" ry="3" fill="url(#c)"/>
<path d="${outer}" fill="none" stroke="url(#r)" stroke-width="2"/>
<path d="M27.6 9.6 Q24 15.5 10.2 39.6" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" stroke-linecap="round" filter="url(#s)"/>
<path d="M58.2 47.6 Q55.4 52 49 52.6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round" filter="url(#s)"/>
<path d="M29.4 27.6 Q26 32 22.6 38.4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round" filter="url(#s)"/>
</svg>
`;
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fs.writeFileSync(path.join(ROOT, 'assets', 'logo', 'glassjelly.svg'), svg);
  console.log('assets/logo/glassjelly.svg', svg.length, 'bytes');
}
