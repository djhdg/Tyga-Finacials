/* Tyga Financials — desktop visual + execution control UI. */
(() => {
  'use strict';
  if (document.getElementById('tygaDesktopUI')) return;

  const style = document.createElement('style');
  style.id = 'tygaDesktopUI';
  style.textContent = `
  @media (min-width: 900px) {
    :root{--bg:#070A14 !important;--panel:#10172A !important;--panel-hi:#17223A !important;--line:#263A5C !important;--text:#F7FAFF !important;--muted:#9AAAC4 !important;--buy:#20F2A0 !important;--sell:#FF4D78 !important;--wait:#FFD166 !important;--cyan:#22D3EE !important;--purple:#A78BFA !important;--orange:#FF9F43 !important;--pink:#FF5CAD !important;--blue:#5EA0FF !important}
    html,body{background:radial-gradient(circle at 8% 0%,rgba(34,211,238,.12),transparent 28%),radial-gradient(circle at 92% 8%,rgba(167,139,250,.13),transparent 30%),linear-gradient(135deg,#070A14 0%,#0A1020 48%,#090B18 100%) !important;min-height:100%}
    body{padding-bottom:32px !important}
    body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,black,transparent 90%)}
    #app,#mainApp,.app,.container,.shell,.page,main{max-width:1500px !important}.container,.shell,.page{margin-left:auto !important;margin-right:auto !important}
    .card,.panel,.section,.signal-card,.stat-card,.metric-card,.chart-card,.glass,.modal-content{background:linear-gradient(145deg,rgba(19,29,49,.96),rgba(11,17,31,.96)) !important;border:1px solid rgba(94,160,255,.18) !important;box-shadow:0 14px 45px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.035) !important;border-radius:18px !important}
    h1,h2,h3{letter-spacing:-.025em !important}button:not(.icon-btn){border-radius:11px !important}
    input,select,textarea{background:#0D1526 !important;border-color:#29405F !important;color:#F7FAFF !important;border-radius:10px !important}
    nav,header,.topbar,.navbar,.app-header{backdrop-filter:blur(18px) !important;-webkit-backdrop-filter:blur(18px) !important;background:rgba(7,10,20,.78) !important;border-bottom:1px solid rgba(94,160,255,.14) !important}
    .bottom-nav,.mobile-nav,#bottomNav{display:none !important}
    ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#080C17}::-webkit-scrollbar-thumb{background:#263A5C;border-radius:20px}
  }
  #tygaExecutionPanel{position:fixed;right:18px;bottom:18px;z-index:10001;width:min(360px,calc(100vw - 36px));background:rgba(10,16,29,.97);border:1px solid rgba(94,160,255,.28);border-radius:16px;padding:12px;box-shadow:0 18px 55px rgba(0,0,0,.42);font:12px system-ui;color:#F7FAFF}
  #tygaExecutionPanel .tx-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:800;letter-spacing:.04em}
  #tygaExecutionPanel .tx-state{font:700 10px ui-monospace,monospace;color:#20F2A0}
  #tygaExecutionPanel .tx-row{display:flex;gap:8px;margin-top:8px}
  #tygaExecutionPanel button{flex:1;padding:9px 10px;border-radius:10px;border:1px solid #263A5C;background:#10172A;color:#F7FAFF;font-weight:800;font-size:11px}
  #tygaExecutionPanel button.tx-on{border-color:#20F2A0;color:#20F2A0;background:rgba(32,242,160,.08)}
  #tygaExecutionPanel button.tx-off{border-color:#FF4D78;color:#FF4D78;background:rgba(255,77,120,.08)}
  #tygaExecutionPanel .tx-note{margin-top:8px;color:#9AAAC4;font-size:10px;line-height:1.35}
  @media(max-width:899px){#tygaExecutionPanel{right:10px;left:10px;bottom:86px;width:auto}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.id='tygaExecutionPanel';
  panel.innerHTML='<div class="tx-title"><span>EXECUTION CONTROL</span><span id="tygaSafetyState" class="tx-state">SAFETY ON</span></div><div class="tx-row"><button id="tygaSafetyToggle" type="button">SAFETY: ON</button><button id="tygaAutoToggle" type="button">AUTO: OFF</button><button id="tygaModeButton" type="button">PAPER</button></div><div class="tx-note">Safety OFF is a restricted paper-only state. Hard loss, position-limit, cooldown and emergency-stop protections cannot be bypassed.</div>';
  document.body.appendChild(panel);

  const autoKey='tyga:auto-execution', safetyKey='tyga:execution-safety';
  const getAuto=()=>localStorage.getItem(autoKey)==='on';
  const getSafety=()=>localStorage.getItem(safetyKey)!=='off';
  const getMode=()=>window.TygaRisk?.settings?.().mode==='live'?'LIVE':'PAPER';
  const setAuto=v=>localStorage.setItem(autoKey,v?'on':'off');
  const setSafety=v=>localStorage.setItem(safetyKey,v?'on':'off');
  function paint(){
    const safe=getSafety(),auto=getAuto(),mode=getMode();
    const s=document.getElementById('tygaSafetyState'),b=document.getElementById('tygaSafetyToggle'),a=document.getElementById('tygaAutoToggle'),m=document.getElementById('tygaModeButton');
    s.textContent=safe?'SAFETY ON':'SAFETY OFF — PAPER ONLY';s.style.color=safe?'#20F2A0':'#FFD166';
    b.textContent='SAFETY: '+(safe?'ON':'OFF');b.className=safe?'tx-on':'tx-off';
    a.textContent='AUTO: '+(auto?'ON':'OFF');a.className=auto?'tx-on':'tx-off';
    m.textContent=mode;m.className=mode==='LIVE'?'tx-off':'tx-on';
  }
  document.getElementById('tygaSafetyToggle').onclick=()=>{
    if(getSafety()){setSafety(false);setAuto(false);try{window.TygaRisk?.configure?.({mode:'paper'});}catch(_){} alert('Execution safety is OFF for PAPER mode only. Hard protections remain active.');}
    else{setSafety(true);paint();}
    paint();
  };
  document.getElementById('tygaAutoToggle').onclick=()=>{
    const next=!getAuto();if(next&&!getSafety()){alert('Turn Execution Safety ON first.');return}if(next&&!confirm('Enable automatic execution? LIVE mode may send real trades.'))return;setAuto(next);paint();
  };
  document.getElementById('tygaModeButton').onclick=()=>{
    const risk=window.TygaRisk;if(!risk?.configure){alert('Risk controller is still loading.');return}
    if(getMode()==='LIVE'){risk.configure({mode:'paper'});paint();return}
    if(!getSafety()){alert('Turn Execution Safety ON before enabling LIVE mode.');return}
    if(confirm('Enable LIVE mode? Real-money trades may be sent. Hard protections remain active.')){risk.configure({mode:'live'});paint()}
  };
  paint();

  const badge=document.createElement('div');badge.id='tygaDesktopBadge';badge.innerHTML='<span></span><b>TYGA FINANCIALS</b><em>LIVE TRADING INTELLIGENCE</em>';badge.style.cssText='display:none;position:fixed;left:28px;bottom:20px;z-index:9000;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(34,211,238,.18);border-radius:999px;background:rgba(7,10,20,.72);backdrop-filter:blur(12px);font:700 10px system-ui;color:#F7FAFF;letter-spacing:.08em;box-shadow:0 8px 25px rgba(0,0,0,.22)';
  badge.querySelector('span').style.cssText='width:7px;height:7px;border-radius:50%;background:#20F2A0;box-shadow:0 0 12px #20F2A0';badge.querySelector('em').style.cssText='font-style:normal;font-weight:600;color:#7E8EA8;letter-spacing:.06em';document.body.appendChild(badge);
  const mq=matchMedia('(min-width:900px)'),sync=()=>{badge.style.display=mq.matches?'flex':'none'};mq.addEventListener?.('change',sync);sync();
})();
