const CACHE = "extinction-odds-v1";
const FILES = ["./", "index.html", "style.css", "app.js"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
    self.skipWaiting();
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k.startsWith("extinction-odds-") && k !== CACHE)
                    .map(k => caches.delete(k))
            )
        )
    );
});
self.addEventListener("fetch", e => {
    if (new URL(e.request.url).origin !== location.origin) return;

    e.respondWith(
        fetch(e.request)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
