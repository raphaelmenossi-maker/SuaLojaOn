/* Service worker: cache do app para funcionar offline. */
const CACHE = 'catalogo-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './lib/ui.js',
  './lib/store.js',
  './lib/share.js',
  './lib/pix.js',
  './lib/csv.js',
  './lib/qrcode.bundle.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // catálogo remoto nunca é cacheado

  // HTML e JSON vêm sempre da rede (para pegar atualizações do catálogo);
  // o resto responde do cache e se atualiza em segundo plano.
  const sempreDaRede = url.pathname.endsWith('.json') || request.mode === 'navigate' || url.pathname.endsWith('.html');

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const daRede = fetch(request)
      .then(async (response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          const cache = await caches.open(CACHE);
          await cache.put(request, copy);
        }
        return response;
      })
      .catch(() => null);

    if (sempreDaRede) {
      const net = await daRede;
      if (net) return net;
    }
    if (cached) {
      daRede; // segue atualizando o cache em segundo plano
      return cached;
    }
    const net = await daRede;
    return net || Response.error();
  })());
});
