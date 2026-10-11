/* glassjelly: subtitle lift (plugin option "Subtitle lift", OFF by default because it changes every user's subtitle
   settings). While the player controls are visible, subtitles rise just above them: the bar's real height is measured
   live (offsetHeight - padding-top of .videoOsdBottom, + jfSubGap px), so it is right at any resolution; when the bar
   hides they rest at jfSubRest px. Both tunable per device in localStorage (defaults 20 / -1).
   It also makes the Subtitle Appearance dialog work on every subtitle type (ASS/SSA too): size, colour, shadow, weight
   and font are re-applied as an !important stylesheet (#jfSubAppearance; unset = 2em, white, uniform outline), and it
   sets each user's subtitle styling to "Custom" (native cues cannot be moved).
   Moved here from a File Transformation entry (id ...000000000001); same guard (window.__jfSubLift), so the two never
   run together. NOTE: no dollar sign anywhere in this file. */
(function(){
  if (window.__jfSubLift) return; window.__jfSubLift = true;
  function num(k, d){ var v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : v; }
  function apply(){
    try {
      var subs = document.querySelectorAll('.videoSubtitlesInner, .videoSecondarySubtitlesInner');
      if (!subs.length) return;
      var GAP  = num('jfSubGap', 20);   // gap above the bar when visible (bigger so big subs don't touch it)
      var REST = num('jfSubRest', -1);  // rest offset when bar hidden (px; +higher / -lower). Default -1.
      var bar = document.querySelector('.videoOsdBottom');
      var lift = REST;
      if (bar && bar.className.indexOf('videoOsdBottom-hidden') === -1) {
        var cs = window.getComputedStyle(bar);
        var pt = parseFloat(cs.paddingTop) || 0;      // transparent gradient on top of the bar
        var h = bar.offsetHeight - pt;                 // actual occupied controls height
        if (h > 0) lift = Math.round(h + GAP);
      }
      for (var i = 0; i < subs.length; i++) {
        var s = subs[i];
        if (!s.style.transition) s.style.transition = 'transform .25s ease-out';
        var t = lift ? ('translateY(' + (-lift) + 'px)') : '';
        if (s.style.transform !== t) s.style.transform = t;
      }
    } catch (e) {}
  }
  var forced = false;
  function forceCustom(){
    try {
      if (forced) return;
      var uid = window.ApiClient && ApiClient.getCurrentUserId && ApiClient.getCurrentUserId();
      if (!uid) return;
      var key = uid + '-localplayersubtitleappearance3';
      var cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}
      if (cur.subtitleStyling !== 'Custom') { cur.subtitleStyling = 'Custom'; localStorage.setItem(key, JSON.stringify(cur)); }
      forced = true;
    } catch (e) {}
  }
  var SIZE = { smaller:'.8em', small:'inherit', large:'1.72em', larger:'2em', extralarge:'2.2em' };
  var SHADOW = {
    none:'none',
    raised:'-0.04em -0.04em #fff, 0px -0.04em #fff, -0.04em 0px #fff, 0.04em 0.04em #000, 0px 0.04em #000, 0.04em 0px #000',
    depressed:'0.04em 0.04em #fff, 0px 0.04em #fff, 0.04em 0px #fff, -0.04em -0.04em #000, 0px -0.04em #000, -0.04em 0px #000',
    uniform:'#000 0px 0.03em, #000 0px -0.03em, #000 0px 0.05em, #000 0px -0.05em, #000 0.03em 0px, #000 -0.03em 0px, #000 0.03em 0.03em, #000 -0.03em 0.03em, #000 0.03em -0.03em, #000 -0.03em -0.03em, #000 0.03em 0.05em, #000 -0.03em 0.05em, #000 0.03em -0.05em, #000 -0.03em -0.05em, #000 0.05em 0px, #000 -0.05em 0px, #000 0.05em 0.03em, #000 -0.05em 0.03em, #000 0.05em -0.03em, #000 -0.05em -0.03em',
    dropshadow:'#000000 0px 0px 7px'
  };
  var FONT = {
    casual:'Gabriola,Segoe Print,Comic Sans MS,Chalkboard,Short Stack,system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
    console:'Consolas,Lucida Console,Menlo,Monaco,monospace',
    cursive:'Lucida Handwriting,Brush Script MT,Segoe Script,cursive,Quintessential,system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
    print:'Georgia,Times New Roman,Arial,Helvetica,serif',
    smallcaps:'Copperplate Gothic,Copperplate Gothic Bold,Copperplate,system-ui,-apple-system,BlinkMacSystemFont,sans-serif'
  };
  var styleEl;
  function buildCss(a){
    a = a || {};
    var d = [];
    d.push('font-size:' + (SIZE[a.textSize] || '2em') + ' !important');           // default Larger (2em) when unset
    d.push('font-weight:' + (a.textWeight === 'bold' ? 'bold' : 'normal') + ' !important');
    d.push('color:' + (a.textColor || '#fff') + ' !important');
    d.push('background-color:' + (a.textBackground || 'transparent') + ' !important'); // no box unless chosen
    d.push('text-shadow:' + (a.dropShadow ? (SHADOW[a.dropShadow] || SHADOW.uniform) : SHADOW.uniform) + ' !important'); // default uniform
    if (a.font && FONT[a.font]) d.push('font-family:' + FONT[a.font] + ' !important');
    return '.videoSubtitlesInner,.videoSecondarySubtitlesInner{' + d.join(';') + ';}';
  }
  function applyAppearance(){
    try {
      var uid = window.ApiClient && ApiClient.getCurrentUserId && ApiClient.getCurrentUserId();
      if (!uid) return;
      var a = {}; try { a = JSON.parse(localStorage.getItem(uid + '-localplayersubtitleappearance3') || '{}') || {}; } catch (e) {}
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'jfSubAppearance'; (document.head || document.documentElement).appendChild(styleEl); }
      var rule = buildCss(a);
      if (styleEl.textContent !== rule) styleEl.textContent = rule;
    } catch (e) {}
  }
  var pending = false;
  function schedule(){ if (pending) return; pending = true; requestAnimationFrame(function(){ pending = false; apply(); }); }
  function start(){
    try { new MutationObserver(schedule).observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] }); } catch (e) {}
    window.addEventListener('resize', schedule, { passive:true });
    document.addEventListener('fullscreenchange', schedule);
    setInterval(function(){ forceCustom(); applyAppearance(); apply(); }, 1000);
    forceCustom(); applyAppearance(); apply();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
