const CACHE = 'simplo-v5';
const ASSETS = [
  './',
  './index.html',
  './logo.svg',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap'
];

// Instalar e cachear assets essenciais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Limpar caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network first para API, Cache first para assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase e APIs — sempre network, nunca cachear
  if (url.hostname.includes('supabase') || url.hostname.includes('openai') || url.hostname.includes('googleapis.com/identitytoolkit')) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline', { status: 503 })));
    return;
  }

  // Fontes e CDN — cache first
  if (url.hostname.includes('fonts.') || url.hostname.includes('cdn.') || url.hostname.includes('cdnjs.')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // App shell (index.html e assets locais) — network first com fallback cache
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});

// Notificações push
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Simplo', body: 'Nova notificação' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'Simplo Estudante', {
      body: data.body || '',
      icon: './logo.svg',
      badge: './logo.svg',
      vibrate: [200, 100, 200],
      data: data.url || './',
      actions: data.actions || []
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || './'));
});

// Receber mensagens do app para mostrar notificações
self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: './logo.svg',
      badge: './logo.svg',
      tag: e.data.tag,
      renotify: false,
      vibrate: [200, 100, 200],
      data: { url: './' }
    });
  }
});
