// Plugin repository: adds a release to manifest.json (the file Jellyfin reads from Dashboard > Plugins > Repositories).
// Usage (run by .github/workflows/plugin.yml):  node tools/manifest.mjs <tag> <zip>
//   prints the release notes for <tag> with: node tools/manifest.mjs --notes <tag>
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'FlorinCamarut1/glassjelly';
const TARGET_ABI = '12.0.0.0';   // Jellyfin 12 (.NET 10); 10.11 servers cannot load this build

// the "## vX.Y.Z" section of CHANGELOG.md, without its heading
function notes(tag) {
  const log = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const start = log.indexOf('## ' + tag + ' ');
  if (start < 0) throw new Error('CHANGELOG.md has no section for ' + tag);
  const body = log.slice(log.indexOf('\n', start) + 1);
  const end = body.search(/^## /m);
  return (end < 0 ? body : body.slice(0, end)).trim();
}

const args = process.argv.slice(2);
if (args[0] === '--notes') {
  console.log(notes(args[1]));
  process.exit(0);
}

const [tag, zip] = args;
if (!/^v\d+\.\d+\.\d+$/.test(tag || '') || !zip) throw new Error('usage: node tools/manifest.mjs vX.Y.Z <zip>');
const version = tag.slice(1) + '.0';
const file = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const plugin = manifest[0];
const entry = {
  version,
  changelog: notes(tag),
  targetAbi: TARGET_ABI,
  sourceUrl: `https://github.com/${REPO}/releases/download/${tag}/${path.basename(zip)}`,
  checksum: crypto.createHash('md5').update(fs.readFileSync(zip)).digest('hex').toUpperCase(),
  timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
};
plugin.versions = [entry, ...plugin.versions.filter(v => v.version !== version)];
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json: ${plugin.name} ${version} (${entry.checksum})`);
