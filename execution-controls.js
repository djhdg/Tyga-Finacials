/* Tyga Financials — execution controls.
 * Safe defaults: PAPER mode + automated execution OFF.
 * LIVE mode requires explicit confirmation and never bypasses hard risk guards.
 */
(() => {
  'use strict';
  const KEY='tyga:auto-execution';
  const getEnabled=()=>localStorage.getItem(KEY)==='on';
  const setEnabled=v=>{try{localStorage.setItem(KEY,v?'on':'off')}catch(_){} };
  const risk=()=>window.TygaRisk;
  const mode=()=>risk?.settings?.().mode==='live'?'LIVE':'PAPER';
  function paint(){
    const a=document.getElementById('tygaExecutionToggle'),m=document.getElementById('tygaModeToggle');
    if(a){const on=getEnabled();a.textContent=on?'AUTO EXECUTION: ON':'AUTO EXECUTION: OFF';a.setAttribute('aria-pressed',String(on));a.style.borderColor=on?'var(--buy,#2FE6A6)':'var(--line,#362C5C)';a.style.color=on?'var(--buy,#2FE6A6)':'var(--muted,#8D84B8)';}
    if(m){m.textContent='MODE: '+mode();m.style.borderColor=mode()==='LIVE'?'var(--sell,#FF4768)':'var(--gold,#EAC069)';m.style.color=mode()==='LIVE'?'var(--sell,#FF4768)':'var(--gold,#EAC069)';}
  }
  function install(){
    if(typeof window.executeAutoTrade!=='function')return false;
    if(!window.executeAutoTrade.__tygaExecutionControl){
      const original=window.executeAutoTrade;
      window.executeAutoTrade=function(...args){if(!getEnabled()){try{window.logVerdict?.('AUTO EXECUTION OFF — signal only')}catch(_){}return false;}return original.apply(this,args);};
      window.executeAutoTrade.__tygaExecutionControl=true;
    }
    if(!document.getElementById('tygaExecutionToggle')){
      const a=document.createElement('button');a.id='tygaExecutionToggle';a.type='button';a.title='Arm/disarm automatic execution; hard safety limits remain active.';
      Object.assign(a.style,{position:'fixed',right:'12px',bottom:'132px',zIndex:10000,padding:'9px 12px',borderRadius:'11px',border:'1px solid var(--line,#362C5C)',background:'var(--panel,#161331)',font:'700 11px ui-monospace,monospace'});
      a.onclick=()=>{const next=!getEnabled();if(next&&!confirm('Arm automated execution? In LIVE mode this can send trades to the connected account.'))return;setEnabled(next);paint();};document.body.appendChild(a);
    }
    if(!document.getElementById('tygaModeToggle')){
      const m=document.createElement('button');m.id='tygaModeToggle';m.type='button';m.title='Switch PAPER/LIVE. Hard loss, position and cooldown limits remain active.';
      Object.assign(m.style,{position:'fixed',right:'12px',bottom:'174px',zIndex:10000,padding:'9px 12px',borderRadius:'11px',border:'1px solid var(--gold,#EAC069)',background:'var(--panel,#161331)',font:'700 11px ui-monospace,monospace'});
      m.onclick=()=>{if(!risk)return;if(mode()==='LIVE'){risk.configure({mode:'paper'});}else{if(!confirm('Enable LIVE mode? Real-money trades may be sent. Hard risk limits remain active.'))return;risk.configure({mode:'live'});}paint();};document.body.appendChild(m);
    }
    paint();return true;
  }
  const timer=setInterval(()=>{if(install())clearInterval(timer)},100);setTimeout(()=>clearInterval(timer),30000);
})();
