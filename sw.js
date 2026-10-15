// Serve the saved copy straight away when the network is slow, so a weak gym signal never blocks the app.
// With no saved copy yet (first visit) it waits for the network. Updates still arrive in the background.
const CACHE = 'gym-routine-v2';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const WAIT_MS = 2500;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? await cache.match('./') : undefined);
    const net = fetch(r).then(res => {
      if (res.ok) { cache.put(r, res.clone()); return res; }
      return cached || res;
    });
    e.waitUntil(net.catch(() => {}));
    if (!cached) return net;
    return Promise.race([net, new Promise(done => setTimeout(() => done(cached), WAIT_MS))]).catch(() => cached);
  })());
});
