/* Tyga Financials — startup recovery watchdog. Firebase/device sync must NEVER block the UI. */
(() => {
  'use strict';
  const START=Date.now(), BOOT_AFTER=2500;
  let forced=false;
  function boot(){
    try{ if(typeof window.__tygaBootAuth==='function'){ window.__tygaBootAuth(); return; } }catch(_){}
    try{ if(typeof window.initAuth==='function'){ Promise.resolve(window.initAuth()).catch(()=>{}); } }catch(_){}
  }
  function forceVisibleAuth(){
    if(forced)return; forced=true;
    const status=document.getElementById('authSyncStatus');
    const auth=document.getElementById('authScreen');
    const body=document.getElementById('authBody');
    if(auth){auth.style.removeProperty('display');auth.classList.remove('hidden');}
    if(status){status.textContent='🟡 Device sync unavailable — continuing on this device';status.style.color='var(--wait)';}
    try{
      if(typeof window.renderAuth==='function' && body && !body.children.length){
        if(typeof window.authView!=='undefined') window.authView='chooser';
        window.renderAuth();
      }
    }catch(_){}
    try{ if(typeof window.initAuth==='function') window.initAuth(); }catch(_){}
    window.dispatchEvent(new CustomEvent('tyga:device-sync-timeout'));
  }
  function check(){
    if(Date.now()-START<BOOT_AFTER){setTimeout(check,250);return;}
    boot();
    setTimeout(forceVisibleAuth,1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
})();
