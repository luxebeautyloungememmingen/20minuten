// fitbox Mitarbeiter PWA - Service Worker
// HINWEIS: Bei jedem Release CACHE_VERSION hochzählen!
const CACHE_VERSION = 'fitbox-v3-2026-05-12';
const CACHE_ASSETS = [
  '/mitarbeiter_app.html',
  '/manifest.json'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.all(
        CACHE_ASSETS.map(asset =>
          cache.add(asset).catch(err => console.log('Cache fehlgeschlagen:', asset, err))
        )
      );
    })
  );
  // skipWaiting NICHT automatisch — Client triggert es manuell für sauberen Reload
});

// ===== ACTIVATE - alte Caches löschen =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ===== MESSAGE - Client-gesteuerte Aktivierung =====
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});

// ===== FETCH =====
// HTML/Manifest: NETWORK FIRST (Updates schnell verfügbar)
// Andere Assets: CACHE FIRST (Performance)
// Supabase API: niemals cachen
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('supabase.co')) return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const isHtml = url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('manifest.json') ||
                 url.pathname.endsWith('sw.js');

  if (isHtml) {
    // NETWORK FIRST für HTML — Updates kommen sofort an
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  let data = { title: 'fitbox', body: 'Neue Benachrichtigung' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://jypbyywxfjniafuygxci.supabase.co/storage/v1/object/public/media/logos/1778337476107_Logo_Memmingen.png',
    badge: 'https://jypbyywxfjniafuygxci.supabase.co/storage/v1/object/public/media/logos/1778337476107_Logo_Memmingen.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'fitbox-notification',
    data: { url: data.url || '/mitarbeiter_app.html' },
    actions: data.actions || [],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/mitarbeiter_app.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('mitarbeiter_app.html') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
