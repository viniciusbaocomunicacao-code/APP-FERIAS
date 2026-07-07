const CACHE     = 'guia-ferias-v24';
const IMG_CACHE = 'guia-ferias-img-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/data.js',
  '/js/app.js',
  '/IMAGENS/LOGO.png',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Imagens: cache primeiro (rápido + offline), busca na rede só na primeira vez
  if (url.pathname.startsWith('/IMAGENS/')) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(IMG_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // App shell (HTML/CSS/JS): rede primeiro para pegar atualizações,
  // cache como fallback para funcionar offline
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
  );
});
