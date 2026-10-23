const V="sk-v1";
const SHELL=["./","index.html","solaris.html","olba.html","adapter.js","firebase-config.js","icon-192.png","icon-512.png","icon-180.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.hostname.endsWith("googleapis.com")&&u.hostname!=="fonts.googleapis.com")return; // Firestore/Auth istekleri
  e.respondWith(fetch(r).then(res=>{if(res.ok&&(u.origin===location.origin||/gstatic|fonts/.test(u.hostname))){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
});
