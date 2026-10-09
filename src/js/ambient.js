/* glassjelly: ambient background (File Transformation id ...0002, installed by install.py).
   Puts the CURRENT content image, small + blurred, on a fixed layer behind the UI (styled by glassjelly.css section 2b):
   details page = item backdrop (fallback: parent backdrop / primary), home = active Media Bar slide (crossfade),
   other pages = Jellyfin's own .backdropContainer image, else nothing (base canvas). Off on video player, login, dashboard.
   Cheap: narrow MutationObservers (throttled 150 ms), ~320 px JPEG (160 px on phones) baked once into a ~64 px
   canvas (v1.3.2). Never throws.
   NOTE: no dollar sign anywhere in this file (File Transformation may treat the replacement text as a regex). */
(function () {
  if (window.__gjAmbient) return;
  window.__gjAmbient = true;
  var doc = document, html = doc.documentElement;
  var root = null, layers = [], cur = 0, curUrl = null, token = 0, timer = 0;
  var cache = {}, onDetails = false, away = false;

  function phone() { return window.innerWidth <= 600 || html.classList.contains('layout-mobile'); }
  function shown(el) { return !!(el && el.getClientRects().length); }
  function cssUrl(s) { var m = /url\(["']?([^"')]+)["']?\)/.exec(s || ''); return m ? m[1] : ''; }
  // same image, small: a 320 px JPEG upscaled + blurred looks identical to the 1920 px one
  function shrink(u) {
    if (!u) return '';
    try {
      var x = new URL(u, location.href);
      if (!/\/Items\/[0-9a-f-]+\/Images\//i.test(x.pathname)) return '';
      ['width', 'height', 'fillWidth', 'fillHeight', 'maxHeight'].forEach(function (k) { x.searchParams.delete(k); });
      x.searchParams.set('maxWidth', phone() ? '160' : '320');
      x.searchParams.set('quality', '50');
      return x.href;
    } catch (e) { return ''; }
  }
  function ensureRoot() {
    root = doc.getElementById('gjAmbient');
    if (root) { layers = root.children; return root; }
    if (!doc.body) return null;
    root = doc.createElement('div');
    root.id = 'gjAmbient';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<canvas class="gj-amb-layer"></canvas><canvas class="gj-amb-layer"></canvas>';
    doc.body.insertBefore(root, doc.body.firstChild);
    layers = root.children; cur = 0; curUrl = null;
    return root;
  }
  function itemImage(id) {
    if (cache[id] !== undefined) return Promise.resolve(cache[id]);
    var api = window.ApiClient;
    if (!api || !api.getItem || !api.getCurrentUserId()) return Promise.resolve('');
    return Promise.resolve(api.getItem(api.getCurrentUserId(), id)).then(function (it) {
      var o = { maxWidth: phone() ? 160 : 320, quality: 50, index: 0 }, u = '';
      function img(iid, type, tag) { o.type = type; o.tag = tag; return api.getImageUrl(iid, o); }
      if (it.BackdropImageTags && it.BackdropImageTags.length) u = img(it.Id, 'Backdrop', it.BackdropImageTags[0]);
      else if (it.ParentBackdropItemId && it.ParentBackdropImageTags && it.ParentBackdropImageTags.length) u = img(it.ParentBackdropItemId, 'Backdrop', it.ParentBackdropImageTags[0]);
      else if (it.ImageTags && it.ImageTags.Primary) u = img(it.Id, 'Primary', it.ImageTags.Primary);
      else if (it.SeriesId && it.SeriesPrimaryImageTag) u = img(it.SeriesId, 'Primary', it.SeriesPrimaryImageTag);
      else if (it.AlbumId && it.AlbumPrimaryImageTag) u = img(it.AlbumId, 'Primary', it.AlbumPrimaryImageTag);
      cache[id] = u;
      return u;
    }, function () { return ''; });
  }
  // returns a URL string, '' (no image -> base canvas) or a Promise of either
  function source() {
    var b = doc.body;
    if (!b || b.classList.contains('dashboardDocument') || /^#\/(dashboard|configurationpage)/i.test(location.hash)) return '';
    if (shown(doc.querySelector('#videoOsdPage:not(.hide)')) || shown(doc.querySelector('.videoPlayerContainer:not(.hide)')) ||
        shown(doc.querySelector('#loginPage:not(.hide)'))) return '';
    var dp = doc.querySelector('.itemDetailPage:not(.hide)');
    onDetails = shown(dp);
    if (onDetails) {
      var m = /[?&]id=([0-9a-f]{32})/i.exec(location.hash);
      if (m) return itemImage(m[1].toLowerCase());
    }
    // Media Bar Enhanced mounts #slides-container directly under <body>, shown only while Home is the visible page
    if (shown(doc.querySelector('.homePage:not(.hide)'))) {
      var slide = doc.querySelector('#slides-container .slide.active img.backdrop');
      if (slide && shown(slide)) return shrink(slide.currentSrc || slide.getAttribute('src'));
    }
    var bis = doc.querySelectorAll('.backdropContainer .backdropImage');
    var bi = bis.length ? bis[bis.length - 1] : null;
    if (bi) return shrink(bi.getAttribute('data-url') || cssUrl(bi.style.backgroundImage));
    return '';
  }
  // v1.3.2 (perf): bake the look into a tiny bitmap once instead of a live CSS filter on full-viewport layers.
  // The --gj-ambient-* tokens stay the knobs: blur is scaled from viewport px to canvas px, scale = central crop.
  function tok(name, def) { var v = parseFloat(getComputedStyle(html).getPropertyValue(name)); return isNaN(v) ? def : v; }
  function paint(c, img) {
    var W = 64, H = Math.max(16, Math.min(160, Math.round(W * window.innerHeight / Math.max(1, window.innerWidth))));
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    if (!g) return;
    var live = typeof g.filter !== 'string';   // no Canvas2D filters (older Safari) -> CSS filter fallback
    c.classList.toggle('gj-amb-live', live);
    var k = Math.max(W / img.naturalWidth, H / img.naturalHeight) * (live ? 1 : tok('--gj-ambient-scale', 1.2));
    var w = img.naturalWidth * k, h = img.naturalHeight * k;
    if (!live) {
      var r = tok('--gj-ambient-blur', 80) * W / Math.max(1, window.innerWidth) * 1.4;
      g.filter = 'blur(' + r.toFixed(2) + 'px) saturate(' + tok('--gj-ambient-saturate', 1.4) + ') brightness(' + tok('--gj-ambient-brightness', 0.42) + ')';
    }
    g.clearRect(0, 0, W, H);
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  function show(url) {
    if (url === curUrl || !ensureRoot()) return;
    curUrl = url;
    var my = ++token;
    if (!url) {
      for (var i = 0; i < layers.length; i++) layers[i].classList.remove('is-on');
      root.classList.remove('is-lit');
      return;
    }
    var pre = new Image();
    pre.onload = function () {
      if (my !== token || !ensureRoot()) return;
      var nxt = 1 - cur;
      try { paint(layers[nxt], pre); } catch (e) { return; }
      layers[nxt].classList.add('is-on');
      if (layers[cur] !== layers[nxt]) layers[cur].classList.remove('is-on');
      cur = nxt;
      root.classList.add('is-lit');
    };
    pre.onerror = function () { if (my === token) { curUrl = null; show(''); } };
    pre.src = url;
  }
  function refresh() {
    timer = 0;
    try {
      var s = source();
      setAway();
      if (s && typeof s.then === 'function') s.then(function (u) { try { show(u || ''); } catch (e) {} }, function () {});
      else show(s || '');
    } catch (e) {}
  }
  function schedule() { if (!timer) timer = setTimeout(refresh, 150); }
  // details page: the sharp hero fades into the blurred ambient once the content scrolls up (CSS: .gj-hero-away)
  function setAway() {
    try {
      var a = onDetails && (window.pageYOffset || html.scrollTop || 0) > window.innerHeight * 0.3;
      if (a !== away) { away = a; html.classList.toggle('gj-hero-away', a); }
    } catch (e) {}
  }
  function start() {
    try {
      html.classList.add('gj-amb');
      ensureRoot();
      // v1.3.2 (perf): no subtree observer on <body> (the Media Bar trailer mutates the DOM ~16x/s). Jellyfin's
      // viewshow + body's own class/children + the Media Bar slides + the backdrop container are enough.
      doc.addEventListener('viewshow', schedule, true);
      new MutationObserver(schedule).observe(doc.body, { childList: true, attributes: true, attributeFilter: ['class'] });
      var slidesObs = null, bdEl = null;
      setInterval(function () {   // cheap: (re)attach to the Media Bar / backdrop containers when they appear
        var sc = doc.getElementById('slides-container');
        if (sc && (!slidesObs || slidesObs.el !== sc)) {
          if (slidesObs) slidesObs.o.disconnect();
          var o = new MutationObserver(function () { if (!doc.hidden) schedule(); });
          o.observe(sc, { subtree: true, attributes: true, attributeFilter: ['class'] });
          slidesObs = { el: sc, o: o };
        }
        var bc = doc.querySelector('.backdropContainer');
        if (bc && bc !== bdEl) { bdEl = bc; new MutationObserver(schedule).observe(bc, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-url'] }); }
      }, 2000);
      window.addEventListener('hashchange', schedule);
      window.addEventListener('popstate', schedule);
      window.addEventListener('scroll', function () { if (onDetails || away) setAway(); }, { passive: true });
      refresh();
    } catch (e) {}
  }
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
})();
