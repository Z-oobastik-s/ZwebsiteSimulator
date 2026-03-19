const CACHE_NAME = 'zoobastiks-v5';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Precache only small critical assets — NO videos (they cache on first view)
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './assets/favicon.svg',
        './assets/images/money.png',
        './assets/css/tailwind.min.css',
        './assets/js/api-config.min.js',
        './assets/js/portal-transition.min.js',
        './assets/js/keyboard.min.js',
        './assets/js/level.min.js',
        './assets/js/stats.min.js',
        './assets/js/main.min.js'
      ]).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (e) { return false; }
}

function isStaticAsset(url) {
  var u = url.toLowerCase();
  return /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|mp4|webm|ogg)$/.test(u) || u.indexOf('/scripts/') !== -1 || u.indexOf('/assets/') !== -1;
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = event.request.url;
  if (url.indexOf('http') !== 0) return;
  var sameOrigin = isSameOrigin(url);
  var staticAsset = isStaticAsset(url);

  if (sameOrigin && staticAsset) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (res) {
          if (res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(function (res) {
      var clone = res.clone();
      if (res.status === 200 && sameOrigin) {
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
      }
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});

