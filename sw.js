// Guarda la app para abrirla sin conexión. Los datos siempre se piden primero a la red.
const CACHE = "leora-studio-v3";
const BASE = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("leora-studio-v") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Los datos y las portadas vienen de api.github.com (otro origen) y la app los guarda por su cuenta.
  const esDato = url.pathname.endsWith("/data/datos.json");
  const esApp = BASE.some(p => url.pathname.endsWith("/" + p.replace("./", ""))) || url.pathname.endsWith("/");
  if (esDato || esApp) {
    // Red primero: si hay conexión, siempre lo último; si no, lo guardado.
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(esDato ? "data/datos.json" : e.request, copia)); }
      return r;
    }).catch(() => caches.match(esDato ? "data/datos.json" : e.request)));
    return;
  }
  // Imágenes: lo guardado primero.
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(cc => cc.put(e.request, copia)); }
    return r;
  })));
});
