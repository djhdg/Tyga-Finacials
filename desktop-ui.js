/* Tyga Financials — desktop visual polish. No floating execution overlays. */
(() => {
  'use strict';
  if (document.getElementById('tygaDesktopUI')) return;
  const style=document.createElement('style');style.id='tygaDesktopUI';style.textContent=`
  @media (min-width:900px){:root{--bg:#070A14!important;--panel:#10172A!important;--panel-hi:#17223A!important;--line:#263A5C!important;--text:#F7FAFF!important;--muted:#9AAAC4!important;--buy:#20F2A0!important;--sell:#FF4D78!important;--wait:#FFD166!important;--cyan:#22D3EE!important;--purple:#A78BFA!important;--orange:#FF9F43!important;--pink:#FF5CAD!important;--blue:#5EA0FF!important}html,body{background:radial-gradient(circle at 8% 0%,rgba(34,211,238,.12),transparent 28%),radial-gradient(circle at 92% 8%,rgba(167,139,250,.13),transparent 30%),linear-gradient(135deg,#070A14 0%,#0A1020 48%,#090B18 100%)!important;min-height:100%}body{padding-bottom:32px!important}#app,#mainApp,.app,.container,.shell,.page,main{max-width:1500px!important}.container,.shell,.page{margin-left:auto!important;margin-right:auto!important}.card,.panel,.section,.signal-card,.stat-card,.metric-card,.chart-card,.glass,.modal-content{background:linear-gradient(145deg,rgba(19,29,49,.96),rgba(11,17,31,.96))!important;border:1px solid rgba(94,160,255,.18)!important;box-shadow:0 14px 45px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.035)!important;border-radius:18px!important}button:not(.icon-btn){border-radius:11px!important}input,select,textarea{background:#0D1526!important;border-color:#29405F!important;color:#F7FAFF!important;border-radius:10px!important}}
  #tygaExecutionPanel,#tygaExecutionToggle,#tygaModeToggle,#tygaDemoStakeInfo,#tygaDesktopBadge{display:none!important}
  `;document.head.appendChild(style);
  ['tygaExecutionPanel','tygaExecutionToggle','tygaModeToggle','tygaDemoStakeInfo','tygaDesktopBadge'].forEach(id=>document.getElementById(id)?.remove());
})();
