/* Tyga Financials — desktop visual upgrade
 * Presentation-only layer: does not alter trading logic, API calls, or signal calculations.
 */
(() => {
  'use strict';
  if (document.getElementById('tygaDesktopUI')) return;

  const style = document.createElement('style');
  style.id = 'tygaDesktopUI';
  style.textContent = `
  @media (min-width: 900px) {
    :root {
      --bg:#070A14 !important;
      --panel:#10172A !important;
      --panel-hi:#17223A !important;
      --line:#263A5C !important;
      --text:#F7FAFF !important;
      --muted:#9AAAC4 !important;
      --buy:#20F2A0 !important;
      --sell:#FF4D78 !important;
      --wait:#FFD166 !important;
      --cyan:#22D3EE !important;
      --purple:#A78BFA !important;
      --orange:#FF9F43 !important;
      --pink:#FF5CAD !important;
      --blue:#5EA0FF !important;
    }
    html,body { background:
      radial-gradient(circle at 8% 0%, rgba(34,211,238,.12), transparent 28%),
      radial-gradient(circle at 92% 8%, rgba(167,139,250,.13), transparent 30%),
      linear-gradient(135deg,#070A14 0%,#0A1020 48%,#090B18 100%) !important;
      min-height:100%;
    }
    body { padding-bottom:32px !important; }
    body::before { content:""; position:fixed; inset:0; pointer-events:none; z-index:-1;
      background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);
      background-size:32px 32px; mask-image:linear-gradient(to bottom,black,transparent 90%); }

    /* Widen the desktop workspace without touching mobile layout. */
    #app, #mainApp, .app, .container, .shell, .page, main { max-width:1500px !important; }
    .container, .shell, .page { margin-left:auto !important; margin-right:auto !important; }

    /* Premium card treatment. */
    .card, .panel, .section, .signal-card, .stat-card, .metric-card, .chart-card, .glass, .modal-content {
      background:linear-gradient(145deg,rgba(19,29,49,.96),rgba(11,17,31,.96)) !important;
      border:1px solid rgba(94,160,255,.18) !important;
      box-shadow:0 14px 45px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.035) !important;
      border-radius:18px !important;
    }
    .card:hover, .panel:hover, .stat-card:hover, .metric-card:hover, .chart-card:hover {
      border-color:rgba(34,211,238,.34) !important;
      box-shadow:0 18px 55px rgba(0,0,0,.3),0 0 30px rgba(34,211,238,.055) !important;
      transform:translateY(-1px); transition:.2s ease;
    }

    /* Headings and numbers should read immediately on a laptop. */
    h1,h2,h3 { letter-spacing:-.025em !important; }
    .price,.value,.metric-value,.balance,.big-number { text-shadow:0 0 22px rgba(34,211,238,.16); }

    /* Bright signal language. */
    .buy, .bullish, [class*="buy"], [class*="bull"] { --signal-glow:rgba(32,242,160,.24); }
    .sell, .bearish, [class*="sell"], [class*="bear"] { --signal-glow:rgba(255,77,120,.22); }
    .buy, .sell, .bullish, .bearish { box-shadow:0 0 28px var(--signal-glow), inset 0 0 20px var(--signal-glow) !important; }

    button:not(.icon-btn) { border-radius:11px !important; border:1px solid rgba(94,160,255,.22) !important; transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease !important; }
    button:not(.icon-btn):hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(34,211,238,.13) !important; border-color:rgba(34,211,238,.5) !important; }
    input,select,textarea { background:#0D1526 !important; border-color:#29405F !important; color:#F7FAFF !important; border-radius:10px !important; }
    input:focus,select:focus,textarea:focus { outline:none !important; border-color:#22D3EE !important; box-shadow:0 0 0 3px rgba(34,211,238,.10) !important; }

    /* Give the primary signal a hero treatment when the app uses common names. */
    .hero-signal, .signal-hero, .main-signal, #signalCard, #signalResult {
      background:linear-gradient(135deg,rgba(20,32,54,.98),rgba(11,20,37,.98)) !important;
      border:1px solid rgba(34,211,238,.28) !important;
      box-shadow:0 20px 60px rgba(0,0,0,.3),0 0 45px rgba(34,211,238,.07) !important;
    }

    /* Make navigation feel like a real desktop product. */
    nav, header, .topbar, .navbar, .app-header {
      backdrop-filter:blur(18px) !important;
      -webkit-backdrop-filter:blur(18px) !important;
      background:rgba(7,10,20,.78) !important;
      border-bottom:1px solid rgba(94,160,255,.14) !important;
    }
    a { transition:color .15s ease,opacity .15s ease; }
    a:hover { color:#22D3EE !important; }

    /* Bright status indicators. */
    .status-dot, .online-dot, .connected-dot { box-shadow:0 0 12px currentColor !important; }

    /* Hide mobile-only bottom navigation on desktop if present. */
    .bottom-nav, .mobile-nav, #bottomNav { display:none !important; }

    /* Scrollbars. */
    ::-webkit-scrollbar { width:8px; height:8px; }
    ::-webkit-scrollbar-track { background:#080C17; }
    ::-webkit-scrollbar-thumb { background:#263A5C; border-radius:20px; }
    ::-webkit-scrollbar-thumb:hover { background:#3C5E87; }
  }
  `;
  document.head.appendChild(style);

  const badge = document.createElement('div');
  badge.id = 'tygaDesktopBadge';
  badge.innerHTML = '<span></span><b>TYGA FINANCIALS</b><em>LIVE TRADING INTELLIGENCE</em>';
  badge.style.cssText = 'display:none;position:fixed;left:28px;bottom:20px;z-index:9000;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(34,211,238,.18);border-radius:999px;background:rgba(7,10,20,.72);backdrop-filter:blur(12px);font:700 10px system-ui;color:#F7FAFF;letter-spacing:.08em;box-shadow:0 8px 25px rgba(0,0,0,.22)';
  badge.querySelector('span').style.cssText='width:7px;height:7px;border-radius:50%;background:#20F2A0;box-shadow:0 0 12px #20F2A0';
  badge.querySelector('em').style.cssText='font-style:normal;font-weight:600;color:#7E8EA8;letter-spacing:.06em';
  document.body.appendChild(badge);
  const mq = matchMedia('(min-width:900px)');
  const sync = () => { badge.style.display = mq.matches ? 'flex' : 'none'; };
  mq.addEventListener?.('change', sync); sync();
})();
