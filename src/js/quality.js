/* glassjelly: quality menu labels (plugin option "Quality labels"). Jellyfin web names every streaming quality by its
   bitrate ("120 Mbps" ... "420 kbps") and the server then picks the output resolution from that bitrate
   (ResolutionNormalizer). This shows the resolution instead, with the bitrate kept as a second line:
   - the player's Settings -> Quality menu (actionsheet buttons, data-id = the bitrate) and the value of its Quality row;
   - Settings -> Playback: the home network / internet / Chromecast quality selects (option value = the bitrate).
   In the player the label also follows the source: a 1080p film stays 1080p at 40 Mbps. The source width comes from
   this device's session (ApiClient.getSessions) and the playing media source. Nothing but text changes: the buttons
   keep their data-id and the selects their values, so Jellyfin applies the same bitrate as before.
   CAP = the widest output Jellyfin 12's ResolutionNormalizer allows for each bitrate, for a 24 fps source (read from
   MediaBrowser.Model.dll; 60 fps sources get one step less). NOTE: no dollar sign anywhere in this file. */
(function () {
  if (window.__gjQuality) return;
  window.__gjQuality = true;
  var doc = document;
  // the bitrates of Jellyfin web's video quality list, its own names and the width cap (0 = no limit)
  var LIST = [
    [120000000, '120 Mbps', 0], [80000000, '80 Mbps', 0], [60000000, '60 Mbps', 0], [40000000, '40 Mbps', 3840],
    [20000000, '20 Mbps', 2560], [15000000, '15 Mbps', 2560], [10000000, '10 Mbps', 1920], [8000000, '8 Mbps', 1920],
    [6000000, '6 Mbps', 1920], [4000000, '4 Mbps', 1280], [3000000, '3 Mbps', 1280], [1500000, '1.5 Mbps', 960],
    [720000, '720 kbps', 640], [420000, '420 kbps', 416]
  ];
  var NAME = {}, CAP = {};
  LIST.forEach(function (q) { NAME[q[0]] = q[1]; CAP[q[0]] = q[2]; });
  var SELECTS = '.selectVideoInNetworkQuality, .selectVideoInternetQuality, .selectChromecastVideoQuality';
  var src = { id: null, w: 0 }, busy = false;

  function cls(w) {
    return w >= 3200 ? '4K' : w >= 2200 ? '1440p' : w >= 1600 ? '1080p' : w >= 1100 ? '720p' :
      w >= 900 ? '540p' : w >= 700 ? '480p' : w >= 560 ? '360p' : '240p';
  }
  // what the server sends at this bitrate: the cap, or the source itself when it is smaller (srcW 0 = unknown)
  function label(bitrate, srcW) {
    var cap = CAP[bitrate];
    if (cap === undefined) return null;
    if (srcW) return cls(cap && cap < srcW ? cap : srcW);
    return cap ? cls(cap) : 'Original';
  }

  // the source of what this device is playing; relabels again once it is known
  function refreshSource() {
    var api = window.ApiClient;
    if (busy || !api || !api.getSessions || !api.deviceId) return;
    busy = true;
    api.getSessions({ deviceId: api.deviceId() }).then(function (sessions) {
      var s = sessions && sessions[0], now = s && s.NowPlayingItem;
      if (!now || now.Id === src.id) { busy = false; return; }
      return api.getItem(api.getCurrentUserId(), now.Id).then(function (item) {
        var msid = s.PlayState && s.PlayState.MediaSourceId, all = item.MediaSources || [];
        var ms = all.filter(function (m) { return m.Id === msid; })[0] || all[0];
        var v = ms && (ms.MediaStreams || []).filter(function (x) { return x.Type === 'Video'; })[0];
        src = { id: now.Id, w: (v && v.Width) || item.Width || 0 };
        busy = false;
        relabel();
      });
    }).catch(function () { busy = false; });
  }

  function relabelSheet(sheet) {
    var items = sheet.querySelectorAll('.actionSheetMenuItem[data-id]'), hits = 0, i;
    for (i = 0; i < items.length; i++) {
      var id = +items[i].getAttribute('data-id'), t = items[i].querySelector('.actionSheetItemText');
      if (NAME[id] && t && (items[i].hasAttribute('data-gj-q') || t.textContent.trim() === NAME[id])) hits++;
    }
    // the player's main settings menu: its Quality row shows the selected name ("20 Mbps", "Auto 20 Mbps")
    var row = sheet.querySelector('.actionSheetMenuItem[data-id="quality"] .actionSheetItemAsideText');
    if (row) {
      refreshSource();
      var orig = row.getAttribute('data-gj-q') || row.textContent;
      LIST.forEach(function (q) {
        if (orig === q[1] || orig.slice(-q[1].length - 1) === ' ' + q[1]) {
          var text = orig.slice(0, orig.length - q[1].length) + label(q[0], src.w);
          row.setAttribute('data-gj-q', orig);
          if (row.textContent !== text) row.textContent = text;
        }
      });
    }
    if (hits < 3) return; // not the video quality list (the audio one shares only 1.5 Mbps)
    refreshSource();
    for (i = 0; i < items.length; i++) {
      var item = items[i], bitrate = +item.getAttribute('data-id'), text = item.querySelector('.actionSheetItemText');
      if (!NAME[bitrate] || !text) continue;
      if (!item.hasAttribute('data-gj-q')) {
        item.setAttribute('data-gj-q', '');
        var rate = doc.createElement('div');
        rate.className = 'listItemBodyText secondary gj-q-rate';
        rate.textContent = NAME[bitrate];
        text.parentNode.insertBefore(rate, text.nextSibling);
      }
      var lab = label(bitrate, src.w);
      if (text.textContent !== lab) text.textContent = lab;
    }
  }

  function relabelSelect(sel) {
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i], bitrate = +o.value;
      if (!NAME[bitrate]) continue;
      var text = label(bitrate, 0) + ' — ' + NAME[bitrate];
      if (o.textContent !== text) o.textContent = text;
    }
  }

  function relabel() {
    try {
      var sheets = doc.querySelectorAll('.actionSheet'), sels = doc.querySelectorAll(SELECTS), i;
      for (i = 0; i < sheets.length; i++) relabelSheet(sheets[i]);
      for (i = 0; i < sels.length; i++) relabelSelect(sels[i]);
    } catch (e) {}
  }

  var pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; relabel(); }); }
  function start() {
    try { new MutationObserver(schedule).observe(doc.body, { subtree: true, childList: true }); } catch (e) {}
    relabel();
  }
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
})();
