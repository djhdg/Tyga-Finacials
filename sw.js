// Tyga Financials — resilient service worker.
// IMPORTANT: do not precache a long list of optional files; one missing file can
// abort installation and leave phones stuck on an older cached shell.
const CACHE='tyga-shell-v36';
const VERSION='36';
const SCRIPT_NAMES=['state-restore','deriv-config','deriv-fix','deriv-buy-fix','deriv-proposal-execution','running-trades-panel','startup-recovery','telegram','desktop-ui','desktop-nav','desktop-workspace','desktop-loader','desktop-terminal','trading-safety','execution-guard','desktop-left-rail-fix','signal-integrity-v2','trading-chart','scalping-strategies','scalping-hotfix','signal-quality','scalping-quality','scalping-analytics','scalping-execution-quality','scalping-robustness','execution-controls'];
const INJECT=SCRIPT_NAMES.map(n=>`<script src="./${n}.js?v=${VERSION}" defer></script>`).join('');
async function htmlResponse(request){
  const r=await fetch(request,{cache:'no-store'});
  if(!r.ok)return r;
  const type=r.headers.get('content-type')||'';
  if(!type.includes('text/html'))return r;
  let html=await r.text();
  // Remove copies previously injected by older workers, then add exactly one set.
  html=html.replace(/<script[^>]+src=["'][^"']+\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,(tag)=>/(?:state-restore|deriv-config|deriv-fix|deriv-buy-fix|deriv-proposal-execution|running-trades-panel|startup-recovery|telegram|desktop-ui|desktop-nav|desktop-workspace|desktop-loader|desktop-terminal|trading-safety|execution-guard|desktop-left-rail-fix|signal-integrity-v2|trading-chart|scalping-strategies|scalping-hotfix|signal-quality|scalping-quality|scalping-analytics|scalping-execution-quality|scalping-robustness|execution-controls)\.js/i.test(tag)?'':tag);
  html=html.replace(/<\/head>/i,`${INJECT}</head>`);
  const headers=new Headers(r.headers);headers.set('Cache-Control','no-store');
  return new Response(html,{status:r.status,statusText:r.statusText,headers});
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{await caches.open(CACHE);self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){
    event.respondWith(htmlResponse(req).then(async r=>{const c=await caches.open(CACHE);await c.put('./index.html',r.clone()).catch(()=>{});return r}).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return r}).catch(()=>caches.match(req)));
});
