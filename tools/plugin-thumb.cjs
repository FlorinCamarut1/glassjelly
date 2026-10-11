// Renders assets/plugin/thumb.png (the plugin image in Jellyfin's catalog and plugin list, 16:9) from the glass logo.
// Usage: node tools/plugin-thumb.cjs   (needs playwright-core + its headless Chromium, as the QA harness)
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/flori/Desktop/Media-server-dashboard/node_modules/playwright-core');
const EXE = 'C:/Users/flori/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const ROOT = path.resolve(__dirname, '..');
const logo = 'data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(ROOT, 'assets/logo/glassjelly.svg'), 'utf8'));
const html = `<html><body style="margin:0;width:640px;height:360px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;
  background:radial-gradient(60% 70% at 30% 35%, rgba(190,205,230,.16), transparent 70%), radial-gradient(50% 60% at 85% 90%, rgba(150,165,205,.10), transparent 70%), linear-gradient(160deg,#1b1c22,#0d0e12)">
  <div style="position:absolute;left:44px;top:56px;width:552px;height:248px;border-radius:40px;
    background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03) 45%,rgba(255,255,255,.02) 70%,rgba(255,255,255,.05));
    box-shadow:inset 2px 2px 2px -1px rgba(255,255,255,.75),inset -2px -2px 2px -1px rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.10),0 30px 60px rgba(0,0,0,.45);
    display:flex;align-items:center;gap:30px;padding:0 44px;box-sizing:border-box">
    <img src="${logo}" style="width:128px;height:112px;filter:drop-shadow(0 10px 24px rgba(0,0,0,.55)) drop-shadow(0 0 22px rgba(255,255,255,.18))">
    <div><div style="color:#fff;font-size:58px;font-weight:700;letter-spacing:-1.5px;text-shadow:0 2px 12px rgba(0,0,0,.4)">GlassJelly</div>
      <div style="color:rgba(235,235,245,.62);font-size:22px;font-weight:500;margin-top:2px">Liquid Glass theme</div></div>
  </div></body></html>`;
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2 });
  await p.setContent(html); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(ROOT, 'assets/plugin/thumb.png') });
  await b.close(); console.log('assets/plugin/thumb.png');
})();
