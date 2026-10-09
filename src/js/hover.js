/* glassjelly: hover light (File Transformation id ...0002, installed by install.py).
   Lights the glass droplet under the mouse from where the cursor is: sets --gj-mx / --gj-my (percent of the element
   box) on the hovered control or card, which glassjelly.css section 21h uses as the centre of its highlight gradient.
   Mouse only (touch and pens keep the static top light), one element at a time, at most once per frame, and the two
   properties are removed again when the pointer leaves. Without this script the light simply sits at the top centre.
   NOTE: no dollar sign anywhere in this file (File Transformation may treat the replacement text as a regex). */
(function () {
  if (window.__gjHover) return;
  window.__gjHover = true;
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var SEL = '.card, .MuiButton-root, .MuiIconButton-root, .MuiTab-root, .MuiMenuItem-root, .MuiListItemButton-root, ' +
    '.detailButton, .actionSheetMenuItem, .paper-icon-button-light, .emby-button, .emby-tab-button, .navMenuOption, ' +
    '.cardOverlayButton, #slides-container button, option';
  var cur = null, x = 0, y = 0, raf = 0;
  function clear(el) {
    try { el.style.removeProperty('--gj-mx'); el.style.removeProperty('--gj-my'); } catch (e) {}
  }
  function paint() {
    raf = 0;
    if (!cur || !cur.isConnected) return;
    var r = cur.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var mx = Math.max(0, Math.min(100, (x - r.left) / r.width * 100));
    var my = Math.max(0, Math.min(100, (y - r.top) / r.height * 100));
    cur.style.setProperty('--gj-mx', mx.toFixed(1) + '%');
    cur.style.setProperty('--gj-my', my.toFixed(1) + '%');
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var t = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (t !== cur) { if (cur) clear(cur); cur = t; }
    x = e.clientX; y = e.clientY;
    if (cur && !raf) raf = requestAnimationFrame(paint);
  }, { passive: true, capture: true });
  document.addEventListener('pointerleave', function () { if (cur) clear(cur); cur = null; }, true);
})();
