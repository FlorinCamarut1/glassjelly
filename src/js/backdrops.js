/* glassjelly: default "Backdrops" ON where the user never chose (File Transformation id ...0002).
   Sets "{userId}-enableBackdrops" = true once per user per device, ONLY if that device never stored a value
   (an explicit on/off chosen in Settings > Display is never touched). No dollar sign in here (File Transformation). */
(function(){
  if (window.__gjBackdrops) return; window.__gjBackdrops = true;
  function run(){
    try {
      var api = window.ApiClient, uid = api && api.getCurrentUserId && api.getCurrentUserId();
      if (!uid) return;
      var flag = 'gjBackdropsDefault-' + uid, key = uid + '-enableBackdrops';
      if (localStorage.getItem(flag) || localStorage.getItem('atvBackdropsDefault-' + uid)) return;
      if (localStorage.getItem(key) === null) localStorage.setItem(key, 'true');
      localStorage.setItem(flag, '1');
    } catch (e) {}
  }
  run(); setInterval(run, 3000);
})();
