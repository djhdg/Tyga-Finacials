(() => {
  'use strict';
  if (innerWidth < 900 || document.getElementById('tygaTerminalStyle')) return;
  const s=document.createElement('style'); s.id='tygaTerminalStyle'; s.textContent=`
  @media(min-width:900px){
    body{background:radial-gradient(circle at 12% 8%,rgba(34,211,238,.10),transparent 28%),radial-gradient(circle at 78% 18%,rgba(168,85,247,.10),transparent 30%),#070c17!important}
    #tygaDesktopWorkspace{inset:0 128px 0 0!important}
    #tygaDesktopWorkspace .tdw-grid{grid-template-columns:minmax(560px,1.7fr) minmax(340px,.85fr)!important;gap:18px!important;padding:18px 26px!important}
    #tygaDesktopWorkspace .tdw-main{min-height:calc(100vh - 110px)!important}
    #tygaDesktopWorkspace .tdw-card{background:linear-gradient(145deg,rgba(15,24,43,.94),rgba(9,15,28,.88));border-color:rgba(100,180,255,.18);box-shadow:0 20px 60px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.025)}
    #tygaDesktopWorkspace .tdw-head{padding:15px 18px}
    #tygaDesktopWorkspace .tdw-title{font-size:13px;letter-spacing:.02em}
    #tygaDesktopWorkspace .tdw-content{padding:18px}
    #tdwMirror{grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr)!important;align-items:stretch}
    #tdwMirror .tdw-feature:first-child{min-height:360px!important;background:radial-gradient(circle at 50% 35%,rgba(34,211,238,.10),transparent 48%),rgba(10,18,33,.72)}
    #tdwMirror .tdw-feature:nth-child(2){min-height:360px!important}
    #tygaDesktopWorkspace .tdw-side{gap:14px}
    #tygaDesktopWorkspace .tdw-mini{min-height:150px}
    #tdwSignal,#tdwDigits,#tdwNews,#tdwJournal,#tdwAccount,#tdwUpgrade{align-items:flex-start;justify-content:flex-start;text-align:left;line-height:1.55;white-space:normal;overflow:auto}
    #tdwSignal{font-size:13px;color:#eef7ff!important}
    #tdwDigits{font-size:12px;color:#bfefff!important}
    #tdwNews{color:#ffd98a!important}.tdw-dot{animation:tdwPulse 1.8s infinite}
    @keyframes tdwPulse{0%,100%{box-shadow:0 0 6px #2fe6a6}50%{box-shadow:0 0 18px #2fe6a6}}
    #tygaDesktopNav{box-shadow:0 20px 65px rgba(0,0,0,.48),0 0 28px rgba(34,211,238,.06)!important}
  }
  `; document.head.appendChild(s);
})();
