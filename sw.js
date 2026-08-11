const CACHE="hambourg-v5-accueil-2-20260811";
const ASSETS=["./","./index.html","./style.css","./app.js","./data.js","./manifest.webmanifest","./icon-180.png","./icon-512.png"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
});

self.addEventListener("fetch",event=>{
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
