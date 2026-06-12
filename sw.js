/* Training PWA service worker.
   Document is network-first (so deploys land immediately, offline falls back to the
   cached shell); static assets are cache-first. Bump CACHE to invalidate old caches. */
var CACHE = 'ht-v13';
var ASSETS = [
  './', './index.html', './manifest.json',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './couch_stretch.webp', './pigeon_pose.webp', './forward_fold.webp',
  './thoracic_rotation.webp', './doorway_chest_opener.webp', './90_90.webp',
  './double_pigeon.webp', './folded_butterfly.webp', './seated_straddle.webp'
];
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return r;
      }).catch(function () {
        return caches.match('./index.html').then(function (m) { return m || caches.match('./'); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) {
        if (r && r.status === 200 && r.type === 'basic') {
          var cp = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return r;
      }).catch(function () { return m; });
    })
  );
});
