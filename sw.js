/* ============================================
   NEONWAVE — Service Worker
   ============================================ */

const CACHE_NAME = 'neonwave-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/components.css',
  '/styles/animations.css',
  '/js/app.js',
  '/js/player.js',
  '/js/search.js',
  '/js/playlist.js',
  '/js/visualizer.js',
  '/js/controls.js',
  '/js/lyrics.js',
  '/manifest.json',
];

// 安裝：快取靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 啟用：清除舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 攔截請求：快取優先，fallback 到網路
self.addEventListener('fetch', (event) => {
  // 跳過 API 請求和第三方資源
  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('youtube.com') ||
      event.request.url.includes('ytimg.com') ||
      event.request.url.includes('lrclib.net') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // 返回快取，同時更新快取
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response.ok) return response;

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
