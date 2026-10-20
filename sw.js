/* Lyric Follow service worker: keeps the app and Bible files available offline after the first visit. */
const CACHE = 'lyricfollow-v36';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/i18n.js', 'js/core.js', 'js/bible.js', 'js/store.js', 'js/stage.js', 'js/app.js', 'js/bible-worker.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.search.includes('ping=')) return;   // the app's server check must reach the network
  if (u.origin === location.origin) {
    // App files: network first so updates arrive; Bible files: cache first (they never change).
    const bible = u.pathname.includes('/bible/') || u.pathname.includes('/vendor/');
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (bible && hit) return hit;
      // App files are always revalidated with the server so an update is picked up on the next open.
      try { const r = await fetch(bible ? e.request : new Request(e.request, { cache: 'no-cache' })); if (r.ok) c.put(e.request, r.clone()); return r; }
      catch (err) { return hit || Response.error(); }
    }));
  } else if (u.hostname.endsWith('gstatic.com') || u.hostname.endsWith('googleapis.com')) {
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(e.request); if (hit) return hit; try { const r = await fetch(e.request); c.put(e.request, r.clone()); return r; } catch (err) { return Response.error(); } }));
  }
});
