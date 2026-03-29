const CACHE_NAME = 'breso-v2'
const PRECACHE_URLS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      await self.clients.claim()
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isNavigation = request.mode === 'navigate'
  const isSameOrigin = url.origin === self.location.origin

  if (isNavigation && isSameOrigin) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
  }
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Soledad', {
      body: data.body || 'Soledad quiere saber como estas',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      data: { url: data.url || '/chat' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/chat'))
})
