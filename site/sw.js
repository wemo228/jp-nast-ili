/* Offline cache. Shell: stale-while-revalidate. data.enc: network-first. Tiles/CDN/fonts: cache-first. */
const V = 'v1';
const SHELL = 'shell-' + V, DATA = 'data', TILES = 'tiles', CDN = 'cdn';
const SHELL_FILES = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs'];
const CDN_FILES = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await (await caches.open(SHELL)).addAll(SHELL_FILES);
    const c = await caches.open(CDN);
    await Promise.all(CDN_FILES.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const c = await caches.open(TILES); const keys = await c.keys();
  if (keys.length > 6000) for (const k of keys.slice(0, keys.length - 5000)) await c.delete(k);
}
let puts = 0;

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.endsWith('basemaps.cartocdn.com')) {
    const key = url.origin.replace(/\/\/[abcd]\./, '//a.') + url.pathname; // one key for all subdomains
    e.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(key); if (hit) return hit;
      try {
        const r = await fetch(req.url, { mode: 'cors' });
        if (r.ok) { c.put(key, r.clone()); if (++puts % 200 === 0) trimTiles(); }
        return r;
      } catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  if (url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open(CDN);
      const hit = await c.match(req.url); if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req.url, r.clone()); return r; }
      catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith('/data.enc') || url.pathname.endsWith('/version.json')) {
    const key = new URL(url.pathname, url.origin).href;
    e.respondWith((async () => {
      const c = await caches.open(DATA);
      try { const r = await fetch(req); if (r.ok) c.put(key, r.clone()); return r; }
      catch (err) { const hit = await c.match(key); return hit || new Response('', { status: 504 }); }
    })());
    return;
  }

  // shell & vendor: stale-while-revalidate
  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    const key = req.mode === 'navigate' ? new URL('./', location.href).href : url.origin + url.pathname;
    const hit = await c.match(key);
    const net = fetch(req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Нет сети', { status: 504 });
  })());
});
