/* Tyga Financials — startup recovery watchdog. Never leave mobile on device-sync splash. */
(() => {
  'use strict';
  const START=Date.now(), TIMEOUT=5000;
  let authFallbackDone=false;
  const norm=el=>(el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  const findSplashNodes=()=>{const hits=[];for(const el of document.querySelectorAll('body *')){if(!norm(el).includes('checking device sync'))continue;let p=el;for(let i=0;i<8&&p.parentElement;i++){const s=getComputedStyle(p);if(s.position==='fixed'||s.position==='absolute'||s.minHeight==='100vh'||s.height==='100vh'||p.id?.toLowerCase().includes('splash'))break;p=p.parentElement}hits.push(p)}return [...new Set(hits)]};
  function startAuthWithoutFirebase(){
    if(authFallbackDone)return;
    const status=document.getElementById('authSyncStatus'),body=document.getElementById('authBody');
    if(!status)return;
    status.textContent='🟡 Device sync unavailable — continuing on this device';status.style.color='var(--wait)';
    try{if(typeof window.initAuth==='function'){authFallbackDone=true;Promise.resolve(window.initAuth()).catch(()=>{})}}catch(_){}
    if(body&&!body.children.length)setTimeout(()=>{try{if(typeof window.initAuth==='function')window.initAuth()}catch(_){}},1200);
  }
  function recover(){startAuthWithoutFirebase();findSplashNodes().forEach(n=>{n.style.setProperty('display','none','important');n.setAttribute('aria-hidden','true')});document.documentElement.dataset.deviceSync='recovered';window.dispatchEvent(new CustomEvent('tyga:device-sync-timeout'))}
  function check(){if(Date.now()-START<TIMEOUT){setTimeout(check,500);return}startAuthWithoutFirebase();if(findSplashNodes().length)recover()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,500),{once:true});else setTimeout(check,500);
})();
