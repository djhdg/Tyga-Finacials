/* Tyga Financials — feature-complete desktop workspace
 * Mirrors the mobile app's existing view system instead of duplicating its trading logic.
 */
(() => {
  'use strict';
  if (window.innerWidth < 900 || document.getElementById('tygaDesktopWorkspace')) return;

  const css = document.createElement('style');
  css.textContent = `
  @media (min-width:900px){
    body{padding-right:142px!important;overflow-x:hidden}
    #tygaDesktopWorkspace{position:fixed;inset:0 128px 0 0;z-index:20;pointer-events:none;background:radial-gradient(circle at 25% 0%,rgba(34,211,238,.08),transparent 34%),radial-gradient(circle at 90% 80%,rgba(167,139,250,.08),transparent 35%)}
    #tygaDesktopWorkspace .tdw-top{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid rgba(120,150,190,.14);background:rgba(7,12,23,.72);backdrop-filter:blur(18px);pointer-events:auto}
    #tygaDesktopWorkspace .tdw-brand{font:900 18px system-ui;color:#f7fbff;letter-spacing:.08em}.tdw-brand b{color:#22d3ee;text-shadow:0 0 16px rgba(34,211,238,.5)}
    #tygaDesktopWorkspace .tdw-status{display:flex;align-items:center;gap:8px;font:700 10px system-ui;color:#91a1bb}.tdw-dot{width:8px;height:8px;border-radius:50%;background:#2fe6a6;box-shadow:0 0 14px #2fe6a6}
    #tygaDesktopWorkspace .tdw-grid{height:calc(100% - 72px);display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,.75fr);gap:16px;padding:16px 22px;box-sizing:border-box;overflow:auto;pointer-events:auto}
    #tygaDesktopWorkspace .tdw-card{border:1px solid rgba(120,150,190,.15);border-radius:18px;background:rgba(12,19,34,.78);box-shadow:0 18px 50px rgba(0,0,0,.2);overflow:hidden}
    #tygaDesktopWorkspace .tdw-main{min-height:620px}.tdw-side{display:flex;flex-direction:column;gap:12px}.tdw-mini{min-height:145px}
    .tdw-head{padding:16px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(120,150,190,.12)}
    .tdw-title{font:850 13px system-ui;color:#f5f8ff}.tdw-kicker{font:700 9px system-ui;color:#71819d;text-transform:uppercase;letter-spacing:.12em}
    .tdw-content{padding:18px}.tdw-empty{min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center;color:#72819a;font:600 11px system-ui}
    #tdwMirror{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tdw-feature{min-height:170px}
    #tygaDesktopWorkspace .tdw-action{border:1px solid rgba(34,211,238,.22);background:rgba(34,211,238,.08);color:#dffbff;border-radius:10px;padding:8px 12px;font:800 10px system-ui;cursor:pointer}
    @media(max-width:1200px){#tygaDesktopWorkspace .tdw-grid{grid-template-columns:1fr}.tdw-side{display:grid;grid-template-columns:repeat(2,1fr)}}
  }
  `;
  document.head.appendChild(css);

  const root=document.createElement('div'); root.id='tygaDesktopWorkspace';
  root.innerHTML=`<div class="tdw-top"><div class="tdw-brand">TYGA <b>FINANCIALS</b></div><div class="tdw-status"><span class="tdw-dot"></span><span id="tdwLiveText">LIVE MARKET</span></div></div>
  <div class="tdw-grid"><section class="tdw-card tdw-main"><div class="tdw-head"><div><div class="tdw-kicker" id="tdwMode">SIGNALS</div><div class="tdw-title" id="tdwTitle">Market Intelligence</div></div><button class="tdw-action" id="tdwOpen">Open Full View</button></div><div class="tdw-content"><div id="tdwMirror"><div class="tdw-card tdw-feature"><div class="tdw-head"><div class="tdw-title">Live Signal</div></div><div class="tdw-content tdw-empty" id="tdwSignal">Waiting for signal engine…</div></div><div class="tdw-card tdw-feature"><div class="tdw-head"><div class="tdw-title">Market / Digits</div></div><div class="tdw-content tdw-empty" id="tdwDigits">Loading market data…</div></div></div><div class="tdw-card" style="margin-top:12px"><div class="tdw-head"><div class="tdw-title">Primary Mobile View</div></div><div class="tdw-content tdw-empty" id="tdwPrimary">Use the right navigation to switch between the complete mobile views.</div></div></div></section>
  <aside class="tdw-side"><section class="tdw-card tdw-mini"><div class="tdw-head"><div class="tdw-title">News</div></div><div class="tdw-content tdw-empty" id="tdwNews">Market news will appear here.</div></section><section class="tdw-card tdw-mini"><div class="tdw-head"><div class="tdw-title">Journal</div></div><div class="tdw-content tdw-empty" id="tdwJournal">Trade journal and history.</div></section><section class="tdw-card tdw-mini"><div class="tdw-head"><div class="tdw-title">Account</div></div><div class="tdw-content tdw-empty" id="tdwAccount">Account status.</div></section><section class="tdw-card tdw-mini"><div class="tdw-head"><div class="tdw-title">Deriv Automation</div></div><div class="tdw-content tdw-empty" id="tdwUpgrade">Upgrade / Auto-Execute controls.</div></section></aside></div>`;
  document.body.appendChild(root);

  const navItems={digits:'DIGITS',signals:'SIGNALS',news:'NEWS',journal:'JOURNAL',upgrade:'UPGRADE',account:'ACCOUNT'};
  function findView(key){
    const re={digits:/digits|digit/i,signals:/signals?|forecast|analysis/i,news:/news/i,journal:/journal|history/i,upgrade:/upgrade|auto.?execute|deriv/i,account:/account|profile|settings/i}[key];
    if(!re)return null;
    const els=[...document.querySelectorAll('.view,section,[role="tabpanel"],[id]')];
    return els.find(e=>re.test((e.id||'')+' '+e.className+' '+(e.getAttribute('aria-label')||'')))||null;
  }
  function textOf(key,limit=420){const v=findView(key);return v?(v.innerText||'').replace(/\s+/g,' ').trim().slice(0,limit):''}
  function refresh(){
    const s=textOf('signals'); const d=textOf('digits'); const n=textOf('news'); const j=textOf('journal'); const a=textOf('account'); const u=textOf('upgrade');
    const set=(id,t,f)=>{const e=document.getElementById(id);if(e)e.textContent=t||f};
    set('tdwSignal',s,'Signal engine ready.');set('tdwDigits',d,'Digits analysis ready.');set('tdwNews',n,'Market news will appear here.');set('tdwJournal',j,'Trade journal and history.');set('tdwAccount',a,'Account status.');set('tdwUpgrade',u,'Upgrade / Auto-Execute controls.');
  }
  document.getElementById('tdwOpen').onclick=()=>{
    const active=document.querySelector('#tygaDesktopNav .tdn-item.active');
    const key=active?.dataset.section||'signals'; const v=findView(key); if(v){v.scrollIntoView({behavior:'smooth',block:'start'});}
  };
  setInterval(refresh,1500); setTimeout(refresh,700);
})();
