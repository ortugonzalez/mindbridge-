const CACHE_NAME = 'breso-v1';
const urlsToCache = ['/', '/chat', '/dashboard'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Soledad', {
      body: data.body || 'Soledad quiere saber cómo estás',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/chat' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data?.url || '/chat')
  );
});
