/* Tyga Financials — execution safety bridge.
 * Runs after the existing app code and gates automatic and manual execution.
 * It also removes the legacy WhatsApp UI/transport; Telegram remains the notification channel.
 */
(() => {
  'use strict';
  const ready=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  const notify=(msg)=>{try{if(typeof showToast==='function')showToast(msg);else console.warn('[Tyga]',msg)}catch(_){console.warn('[Tyga]',msg)}};
  const execState=()=>typeof derivExec!=='undefined'?derivExec:null;
  const acctState=()=>typeof accountSettings!=='undefined'?accountSettings:null;

  function removeWhatsApp(){
    [...document.querySelectorAll('.section-label,.acct-card')].forEach(el=>{
      const text=(el.innerText||'').toLowerCase();
      if(text.includes('whatsapp alerts')||text.includes('callmebot')){
        const prev=el.previousElementSibling;
        el.remove();
        if(prev&&/whatsapp alerts/i.test(prev.innerText||''))prev.remove();
      }
    });
    window.sendWhatsApp=()=>{};
  }

  function gate(stake,forceLive){
    if(!window.TygaRisk)return{ok:false,reason:'Trading safety module is not loaded.'};
    return window.TygaRisk.canTrade({stake:Number(stake)||0,forceLive:!!forceLive});
  }

  function installAutoGate(){
    if(typeof window.executeAutoTrade!=='function'||window.executeAutoTrade.__tygaGuarded)return false;
    const original=window.executeAutoTrade;
    function guarded(call,sym,riskAmt){
      const ex=execState();
      const isLive=!!(ex&&ex.accountInfo&&!ex.accountInfo.is_virtual);
      const result=gate(Math.max(Number(riskAmt)||0,0.35),isLive);
      if(!result.ok){notify('🛡 Trade blocked: '+result.reason);return;}
      return original.apply(this,arguments);
    }
    guarded.__tygaGuarded=true;
    window.executeAutoTrade=guarded;
    return true;
  }

  function installDigitGate(){
    const btn=document.getElementById('btnDigitTrade');
    if(!btn||btn.__tygaGuarded)return false;
    btn.addEventListener('click',(e)=>{
      const a=acctState();
      const stake=Math.max((Number(a?.size)||0)*0.005,0.35);
      const ex=execState();
      const isLive=!!(ex&&ex.accountInfo&&!ex.accountInfo.is_virtual);
      const result=gate(stake,isLive);
      if(!result.ok){e.preventDefault();e.stopImmediatePropagation();notify('🛡 Digit trade blocked: '+result.reason);}
    },true);
    btn.__tygaGuarded=true;
    return true;
  }

  function connectExecutionMode(){
    const toggle=document.getElementById('dtToggle');
    if(!toggle||toggle.__tygaModeGuarded)return false;
    toggle.addEventListener('click',()=>setTimeout(()=>{
      const ex=execState();
      if(ex?.enabled)window.TygaRisk?.configure({mode:'live'});
      else window.TygaRisk?.configure({mode:'paper'});
    },0),true);
    toggle.__tygaModeGuarded=true;
    return true;
  }

  function wrapSettlement(){
    if(typeof window.handleContractUpdate!=='function'||window.handleContractUpdate.__tygaGuarded)return false;
    const original=window.handleContractUpdate;
    async function guarded(poc){
      const shouldRecord=!!(poc&&poc.is_sold&&typeof autoContracts!=='undefined'&&autoContracts[poc.contract_id]&&!autoContracts[poc.contract_id].settled);
      const result=await original.apply(this,arguments);
      if(shouldRecord&&window.TygaRisk)window.TygaRisk.recordTrade({pnl:Number(poc.profit)||0});
      return result;
    }
    guarded.__tygaGuarded=true;
    window.handleContractUpdate=guarded;
    return true;
  }

  function statusPanel(){
    if(document.getElementById('tygaRiskBadge'))return;
    const host=document.getElementById('view-upgrade')||document.getElementById('view-account');
    if(!host)return;
    const box=document.createElement('div');box.id='tygaRiskBadge';
    box.style='margin:12px 16px;padding:12px 14px;border-radius:12px;border:1px solid rgba(34,211,238,.28);background:rgba(34,211,238,.07);font:700 11px system-ui;color:var(--text)';
    box.innerHTML='<div style="color:var(--cyan);margin-bottom:5px">🛡 TYGA EXECUTION SAFETY</div><div id="tygaRiskText"></div>';
    host.prepend(box);
    const update=()=>{const r=window.TygaRisk?.settings?.();const t=document.getElementById('tygaRiskText');if(t&&r)t.textContent=`Mode: ${r.mode.toUpperCase()} · Max stake $${r.maxStake} · Daily loss $${r.maxDailyLoss} · Max ${r.maxConsecutiveLosses} consecutive losses · ${r.maxTradesPerHour}/hour · ${r.cooldownSeconds}s cooldown`;};
    update();setInterval(update,2000);
  }

  function start(){
    removeWhatsApp();installAutoGate();installDigitGate();connectExecutionMode();wrapSettlement();statusPanel();
    const observer=new MutationObserver(()=>{removeWhatsApp();installAutoGate();installDigitGate();connectExecutionMode();wrapSettlement();statusPanel();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),20000);
  }
  ready(start);
})();
