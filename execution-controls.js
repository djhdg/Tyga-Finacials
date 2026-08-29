/* Tyga Financials — execution controls + demo balance sync. */
(() => {
  'use strict';
  const KEY='tyga:auto-execution';
  const getEnabled=()=>localStorage.getItem(KEY)==='on';
  const setEnabled=v=>{try{localStorage.setItem(KEY,v?'on':'off')}catch(_){} };
  const risk=()=>window.TygaRisk;
  const mode=()=>risk?.settings?.().mode==='live'?'LIVE':'PAPER';
  const ex=()=>typeof derivExec!=='undefined'?derivExec:null;
  let balance=NaN;
  const read=id=>(document.getElementById(id)?.value||'').trim();
  const selectedAccountBalance=()=>{const o=document.getElementById('dtAccountSelect')?.selectedOptions?.[0];const text=o?.textContent||'';const m=text.match(/(?:USD|EUR|GBP|AUD|CAD|BTC|ETH)?\s*([0-9]+(?:[.,][0-9]+)?)\s*$/i);return m?Number(m[1].replace(/,/g,'')):NaN};
  async function syncDemoBalance(){
    const e=ex(); if(!e?.token||!e?.loginId)return;
    try{
      const res=await fetch('https://api.derivws.com/trading/v1/options/accounts',{headers:{'Deriv-App-ID':read('dtAppId')||e.appId||'','Authorization':'Bearer '+e.token}});
      if(!res.ok)return;
      const j=await res.json(); const raw=j?.data??j?.accounts??[]; const arr=Array.isArray(raw)?raw:Object.values(raw||{});
      const a=arr.find(x=>(x.account_id||x.accountId||x.id||x.loginid||x.login_id)===e.loginId);
      const b=Number(a?.balance); if(Number.isFinite(b)&&b>0){balance=b;e.accountInfo=e.accountInfo||{};e.accountInfo.balance=b;}
    }catch(_){ }
  }
  function getBalance(){const e=ex(),a=window.accountSettings;const vals=[balance,e?.accountInfo?.balance,a?.balance,a?.accountBalance,selectedAccountBalance()];for(const v of vals){const n=Number(v);if(Number.isFinite(n)&&n>0)return n}return NaN}
  function patchRisk(){const r=risk();if(!r||r.__tygaBalancePatched)return false;const original=r.canTrade.bind(r);r.canTrade=function(opts={}){const next={...opts};if(mode()==='PAPER'&&next.balance==null)next.balance=getBalance();return original(next)};r.__tygaBalancePatched=true;return true}
  function paint(){const a=document.getElementById('tygaExecutionToggle'),m=document.getElementById('tygaModeToggle');if(a){const on=getEnabled();a.textContent=on?'AUTO EXECUTION: ON':'AUTO EXECUTION: OFF';a.setAttribute('aria-pressed',String(on));a.style.borderColor=on?'var(--buy,#2FE6A6)':'var(--line,#362C5C)';a.style.color=on?'var(--buy,#2FE6A6)':'var(--muted,#8D84B8')}if(m){m.textContent='MODE: '+mode();m.style.borderColor=mode()==='LIVE'?'var(--sell,#FF4768)':'var(--gold,#EAC069)';m.style.color=mode()==='LIVE'?'var(--sell,#FF4768)':'var(--gold,#EAC069')}const s=document.getElementById('tygaDemoStakeInfo');if(s){const b=getBalance();s.textContent=mode()==='PAPER'&&Number.isFinite(b)?`Demo max stake: ${(b*.60).toFixed(2)} (60% of ${b.toFixed(2)})`:'Demo balance not available yet';}}
  function install(){patchRisk();if(typeof window.executeAutoTrade!=='function')return false;if(!window.executeAutoTrade.__tygaExecutionControl){const original=window.executeAutoTrade;window.executeAutoTrade=function(...args){if(!getEnabled()){try{window.logVerdict?.('AUTO EXECUTION OFF — signal only')}catch(_){}return false}return original.apply(this,args)};window.executeAutoTrade.__tygaExecutionControl=true}if(!document.getElementById('tygaExecutionToggle')){const a=document.createElement('button');a.id='tygaExecutionToggle';a.type='button';a.title='Arm/disarm automatic execution; hard safety limits remain active.';Object.assign(a.style,{position:'fixed',right:'12px',bottom:'132px',zIndex:10000,padding:'9px 12px',borderRadius:'11px',border:'1px solid var(--line,#362C5C)',background:'var(--panel,#161331)',font:'700 11px ui-monospace,monospace'});a.onclick=()=>{const next=!getEnabled();if(next&&!confirm('Arm automated execution? In LIVE mode this can send trades to the connected account.'))return;setEnabled(next);paint()};document.body.appendChild(a)}if(!document.getElementById('tygaModeToggle')){const m=document.createElement('button');m.id='tygaModeToggle';m.type='button';m.title='Switch PAPER/LIVE. Hard loss, position and cooldown limits remain active.';Object.assign(m.style,{position:'fixed',right:'12px',bottom:'174px',zIndex:10000,padding:'9px 12px',borderRadius:'11px',border:'1px solid var(--gold,#EAC069)',background:'var(--panel,#161331)',font:'700 11px ui-monospace,monospace'});m.onclick=()=>{if(!risk)return;if(mode()==='LIVE'){risk.configure({mode:'paper'})}else{if(!confirm('Enable LIVE mode? Real-money trades may be sent. Hard risk limits remain active.'))return;risk.configure({mode:'live'})}paint()};document.body.appendChild(m)}if(!document.getElementById('tygaDemoStakeInfo')){const s=document.createElement('div');s.id='tygaDemoStakeInfo';Object.assign(s.style,{position:'fixed',right:'12px',bottom:'216px',zIndex:9999,padding:'5px 8px',borderRadius:'8px',background:'rgba(10,16,29,.88)',color:'var(--muted,#9AAAC4)',font:'700 9px ui-monospace,monospace'});document.body.appendChild(s)}paint();return true}
  const timer=setInterval(()=>{syncDemoBalance().finally(()=>{install()})},5000);install();
})();
