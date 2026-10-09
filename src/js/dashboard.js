/* glassjelly: re-apply the Branding Custom CSS on admin routes (File Transformation id ...0003, installed by
   install.py; --no-dashboard leaves it out). Jellyfin 12 renders <style>{CustomCss}</style> only inside the
   user/legacy layouts; the dashboard layout (#/dashboard, #/configurationpage, #/metadata) does not mount it, but it
   sets body.dashboardDocument. While that class is on <body> this script appends <style id="gj-dashboard-css"> at the
   END of <body> (after every lazily added chunk <link> in <head>, the same cascade slot React uses) and removes it
   when the class goes away, so user pages never get a duplicate.
   CSS source: the copy React rendered on a user page (no request), else GET Branding/Css (direct load of an admin URL).
   Honours Settings > Display > "Disable server custom CSS" (localStorage "<userId>-disableCustomCss").
   Limitation: after saving Branding > Custom CSS on the dashboard, admin pages keep the old CSS until a reload.
   NOTE: no dollar sign anywhere in this file (File Transformation may treat the replacement text as a regex). */
(function () {
  if (window.__gjDashCss) return;
  window.__gjDashCss = true;
  var ID = 'gj-dashboard-css', MARK = 'GLASSJELLY BEGIN', CDN = 'glassjelly', css = null, busy = false;
  function uid() { try { return window.ApiClient && window.ApiClient.getCurrentUserId(); } catch (e) { return null; } }
  function disabled() { var u = uid(); try { return !!u && localStorage.getItem(u + '-disableCustomCss') === 'true'; } catch (e) { return false; } }
  function onDash() { return !!document.body && document.body.classList.contains('dashboardDocument'); }
  function grab() {
    var s = document.querySelectorAll('style');
    for (var i = 0; i < s.length; i++) if (s[i].id !== ID && (s[i].textContent.indexOf(MARK) !== -1 || s[i].textContent.indexOf(CDN) !== -1)) return s[i].textContent;
    return null;
  }
  function url() {
    try { if (window.ApiClient) return window.ApiClient.getUrl('Branding/Css'); } catch (e) {}
    return location.pathname.split('/web/')[0] + '/Branding/Css';
  }
  function put() {
    if (!onDash() || disabled() || document.getElementById(ID)) return;
    var el = document.createElement('style');
    el.id = ID; el.textContent = css;
    document.body.appendChild(el);
  }
  function sync() {
    try {
      var el = document.getElementById(ID);
      if (!onDash() || disabled()) { if (el) el.remove(); if (css === null && !onDash()) css = grab(); return; }
      if (el) return;
      if (css === null) css = grab();
      if (css !== null) return put();
      if (busy) return;
      busy = true;
      fetch(url(), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { busy = false; if (t) { css = t; put(); } }, function () { busy = false; });
    } catch (e) {}
  }
  function start() {
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
