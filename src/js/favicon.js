/* glassjelly: favicon = the theme logo (File Transformation id ...0002). It reads --gj-logo from the theme CSS, so it
   does nothing when the CSS is off (--no-logo, "Disable server custom CSS", uninstalled).
   SVG favicons: Chromium/Firefox; Safari keeps Jellyfin's icon. */
(function(){
  if (window.__gjLogo) return; window.__gjLogo = true;
  var n = 0;
  function run(){
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--gj-logo') || '';
      var i = v.indexOf('url("data:image/svg+xml,'), j = v.lastIndexOf('")');
      if (i === -1 || j <= i) { if (++n < 30) setTimeout(run, 1000); return; }
      var uri = v.slice(i + 5, j), links = document.querySelectorAll('link[rel~="icon"]');
      if (!links.length) { var l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); links = [l]; }
      for (var k = 0; k < links.length; k++) { links[k].type = 'image/svg+xml'; links[k].href = uri; }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
