/* glassjelly: dock Jellyfin's "Skip Intro / Skip Recap..." button (native media segments, Jellyfin 12:
   body > .skip-button-container > button.skip-button, created once and then shown/hidden by Jellyfin) INSIDE the
   frosted player bar while the OSD is visible, and let it float bottom-right while the OSD is hidden.
   File Transformation id ...0002, installed by install.py; styled by glassjelly.css section 11.
   - desktop: in the controls row, just left of the right-hand buttons (heart / CC / audio ...);
   - phones (<= 600px): at the panel's top-right, in the title row (the controls row is already full there).
   The node is MOVED (never cloned), so Jellyfin's click listener and its show/hide logic keep working. It goes back
   to its own container whenever the OSD hides, the button is hidden, or the OSD view is torn down, so Jellyfin always
   finds it where it created it. Only runs while the theme CSS is active (--gj-version set). Never throws.
   NOTE: no dollar sign anywhere in this file (File Transformation may treat the replacement text as a regex). */
(function () {
  if (window.__gjSkipDock) return;
  window.__gjSkipDock = true;
  var doc = document, html = doc.documentElement, btn = null, home = null, timer = 0, retry = 0;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  // v1.3.2 (perf): remembered once true (a forced style read per DOM mutation otherwise); false is re-checked,
  // since the Branding CSS can arrive after this script starts
  var isThemed = false;
  function themed() { try { return isThemed || (isThemed = !!getComputedStyle(html).getPropertyValue('--gj-version').trim()); } catch (e) { return false; } }
  function phone() { return window.innerWidth <= 600; }
  function hidden(b) { return b.classList.contains('hide') || b.classList.contains('skip-button-hidden'); }
  function bar() {
    var bars = doc.querySelectorAll('.videoOsdBottom');
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (b.isConnected && b.getClientRects().length && !b.classList.contains('hide') && !b.classList.contains('videoOsdBottom-hidden')) return b;
    }
    return null;
  }
  // where the button goes inside a visible bar (null = keep it floating)
  function slot(b) {
    var oc = b.querySelector('.osdControls');
    if (!oc) return null;
    if (phone()) {
      var t = oc.querySelector('.osdMainTextContainer');
      if (t && t.getClientRects().length) return { parent: t, before: null };
    }
    var row = oc.querySelector('.buttons');
    if (!row) return null;
    var tt = row.querySelector(':scope > .osdTimeText');
    return { parent: row, before: tt ? tt.nextSibling : null };
  }
  function flip(mutate) {
    var a = btn.getBoundingClientRect();
    mutate();
    if (!a.width || (reduce && reduce.matches) || !btn.animate) return;
    var b = btn.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (!b.width || Math.abs(dx) + Math.abs(dy) < 2) return;
    try {
      btn.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(0,0)' }],
        { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } catch (e) {}
  }
  function goHome(animate) {
    if (!home || !home.isConnected) {
      home = doc.querySelector('.skip-button-container');
      if (!home) { home = doc.createElement('div'); home.className = 'skip-button-container'; doc.body.appendChild(home); }
    }
    if (btn.parentNode === home) return;
    var m = function () { home.appendChild(btn); btn.classList.remove('gj-skip-docked'); };
    if (animate) flip(m); else m();
  }
  function sync() {
    timer = 0;
    try {
      if (!btn) {
        btn = doc.querySelector('.skip-button-container > .skip-button');
        if (!btn) return;
        home = btn.parentNode;
      }
      if (!btn.isConnected) { goHome(false); return; }        // the OSD view was removed with the button docked in it
      var b = themed() ? bar() : null, s = b && slot(b);
      if (s) {
        if (btn.parentNode === s.parent && (!s.before || btn.nextSibling === s.before || btn === s.before)) return;
        flip(function () {
          s.parent.insertBefore(btn, s.before && s.before.parentNode === s.parent ? s.before : null);
          btn.classList.add('gj-skip-docked');
        });
        return;
      }
      if (btn.parentNode === home) return;
      // OSD hiding: if Jellyfin is fading the button out too, let it fade inside the bar and re-home it afterwards
      if (hidden(btn) && !btn.classList.contains('hide') && retry < 6) { retry++; timer = setTimeout(sync, 120); return; }
      retry = 0;
      goHome(!hidden(btn));
    } catch (e) {}
  }
  function schedule() { if (!timer) timer = setTimeout(sync, 40); }
  function start() {
    try {
      new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      window.addEventListener('resize', schedule, { passive: true });
      sync();
    } catch (e) {}
  }
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
})();
