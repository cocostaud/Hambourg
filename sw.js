const CACHE="hambourg-v5-popup-fiches-20260812";
const RUNTIME="hambourg-v5-runtime-popup-fiches-20260812";
const ASSETS=["./","./index.html","./style.css","./app.js","./data.js","./manifest.webmanifest","./icon-180.png","./icon-512.png"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>![CACHE,RUNTIME].includes(key)).map(key=>caches.delete(key)))));
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(RUNTIME).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==="navigate"?caches.match("./index.html"):Response.error()))));
});
