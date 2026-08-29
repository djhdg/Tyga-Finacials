/* Tyga Financials — startup recovery watchdog. Prevents an indefinite mobile device-sync splash. */
(() => {
  'use strict';
  const START=Date.now(), TIMEOUT=9000;
  const textOf=el=>(el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  function findSplash(){
    const exact=[...document.querySelectorAll('body *')].find(el=>textOf(el).includes('checking device sync'));
    if(!exact)return null;
    let el=exact;
    for(let i=0;i<4&&el.parentElement;i++){
      if((el.children?.length||0)<=4)break;
      el=el.parentElement;
    }
    return el;
  }
  function showApp(){
    const splash=findSplash();
    if(splash){splash.style.setProperty('display','none','important');splash.setAttribute('aria-hidden','true');}
    const auth=document.getElementById('authScreen'),app=document.getElementById('app')||document.getElementById('mainApp');
    if(auth&&!app?.classList.contains('active')&&getComputedStyle(auth).display==='none')auth.style.display='block';
    if(app&&getComputedStyle(app).display==='none')app.style.display='block';
    document.documentElement.dataset.deviceSync='timeout-recovered';
    if(!document.getElementById('tygaSyncRecoveryNotice')){
      const n=document.createElement('div');n.id='tygaSyncRecoveryNotice';n.textContent='Device sync timed out — continuing safely.';n.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:100000;background:#161331;color:#EAC069;border:1px solid #362C5C;border-radius:999px;padding:6px 10px;font:700 9px ui-monospace,monospace;box-shadow:0 8px 24px rgba(0,0,0,.3)';document.body.appendChild(n);setTimeout(()=>n.remove(),3500);
    }
    window.dispatchEvent(new CustomEvent('tyga:device-sync-timeout'));
  }
  function check(){
    if(Date.now()-START<TIMEOUT){setTimeout(check,500);return;}
    if(findSplash())showApp();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,500),{once:true});else setTimeout(check,500);
})();
