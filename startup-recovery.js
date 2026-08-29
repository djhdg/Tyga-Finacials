/* Tyga Financials — startup recovery watchdog. Never leave mobile on device-sync splash. */
(() => {
  'use strict';
  const START=Date.now(), TIMEOUT=7000;
  const norm=el=>(el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  const isSyncText=el=>norm(el).includes('checking device sync');
  function findSplashNodes(){
    const hits=[];
    for(const el of document.querySelectorAll('body *')){
      if(!isSyncText(el))continue;
      let p=el;
      // Prefer the nearest ancestor that behaves like a full-screen splash.
      for(let i=0;i<8&&p.parentElement;i++){
        const s=getComputedStyle(p);
        if(s.position==='fixed'||s.position==='absolute'||s.minHeight==='100vh'||s.height==='100vh'||p.id?.toLowerCase().includes('splash'))break;
        p=p.parentElement;
      }
      hits.push(p);
    }
    return [...new Set(hits)];
  }
  function recover(){
    const nodes=findSplashNodes();
    nodes.forEach(n=>{n.style.setProperty('display','none','important');n.setAttribute('aria-hidden','true')});
    const auth=document.getElementById('authScreen');
    const app=document.getElementById('app')||document.getElementById('mainApp');
    const nav=document.getElementById('bottomNav');
    // If the app shell exists, expose the normal authentication/app flow instead of
    // trying to guess credentials or bypass authentication.
    if(auth)auth.classList.remove('hidden');
    if(app)app.classList.add('hidden');
    if(nav)nav.classList.add('hidden');
    document.documentElement.dataset.deviceSync='recovered';
    if(!document.getElementById('tygaSyncRecoveryNotice')){
      const n=document.createElement('div');
      n.id='tygaSyncRecoveryNotice';
      n.textContent='Device sync timed out. Please continue normally.';
      n.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:100000;background:#161331;color:#EAC069;border:1px solid #362C5C;border-radius:999px;padding:7px 11px;font:700 9px ui-monospace,monospace;box-shadow:0 8px 24px rgba(0,0,0,.3);white-space:nowrap';
      document.body.appendChild(n);setTimeout(()=>n.remove(),4000);
    }
    window.dispatchEvent(new CustomEvent('tyga:device-sync-timeout'));
  }
  function check(){
    if(Date.now()-START<TIMEOUT){setTimeout(check,500);return}
    if(findSplashNodes().length)recover();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,500),{once:true});
  else setTimeout(check,500);
})();
