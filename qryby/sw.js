const CACHE='qryby-pwa-v3';
const CORE=['/qryby','/qryby.webmanifest','/qryby-icon-192.png','/qryby-icon-512.png','/qryby-icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('qryby-pwa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  if(u.pathname==='/qryby'||u.pathname.startsWith('/qryby-')){
    e.respondWith(fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('/qryby'))));
  }
});