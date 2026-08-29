/* Tyga Financials — MT5-style running trades monitor. */
(() => {
  'use strict';
  if (window.__tygaRunningTradesPanel) return;
  window.__tygaRunningTradesPanel = true;

  const css = document.createElement('style');
  css.id = 'tygaRunningTradesCss';
  css.textContent = `
    #tygaRunningTrades{position:fixed;right:16px;top:88px;width:390px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);z-index:9998;background:rgba(9,14,26,.98);border:1px solid rgba(94,160,255,.28);border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.42);color:#f7faff;font:12px system-ui;overflow:hidden}
    #tygaRunningTrades .rt-head{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-bottom:1px solid #263a5c;background:rgba(16,23,42,.96)}
    #tygaRunningTrades .rt-title{font-weight:900;letter-spacing:.06em}.rt-count{font:700 10px ui-monospace;color:#9aaac4;margin-left:6px}.rt-actions{display:flex;gap:5px}.rt-actions button{border:1px solid #263a5c;background:#10172a;color:#f7faff;border-radius:8px;padding:5px 8px;font-weight:800;font-size:10px}
    #tygaRunningTrades .rt-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:9px 10px;border-bottom:1px solid #1d2a45}.rt-stat{padding:7px;border:1px solid #1d2a45;border-radius:9px;background:#0d1526}.rt-stat b{display:block;font:800 13px ui-monospace}.rt-stat span{font-size:8px;color:#9aaac4;text-transform:uppercase;letter-spacing:.08em}.rt-pos{color:#20f2a0!important}.rt-neg{color:#ff4d78!important}
    #tygaRunningTrades .rt-list{overflow:auto;max-height:calc(100vh - 235px);padding:8px}.rt-empty{padding:28px 12px;text-align:center;color:#9aaac4}.rt-card{border:1px solid #263a5c;border-radius:11px;background:#0d1526;padding:9px;margin-bottom:7px}.rt-card-head{display:flex;justify-content:space-between;gap:8px}.rt-contract{font-weight:800}.rt-sub{font-size:9px;color:#9aaac4;margin-top:2px}.rt-pnl{font:900 14px ui-monospace}.rt-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}.rt-grid div{padding:5px 6px;background:#10172a;border-radius:7px}.rt-grid span{display:block;color:#788aa8;font-size:8px;text-transform:uppercase}.rt-grid b{font:700 10px ui-monospace}.rt-close{width:100%;margin-top:8px;padding:7px;border-radius:8px;border:1px solid #ff4d78;background:rgba(255,77,120,.08);color:#ff4d78;font-weight:900;font-size:10px}.rt-close:disabled{opacity:.5}.rt-collapsed .rt-body{display:none}.rt-collapsed{width:245px!important}.rt-collapsed .rt-summary{display:none}
    @media(max-width:899px){#tygaRunningTrades{top:auto;right:10px;bottom:78px;width:calc(100vw - 20px);max-height:55vh}.rt-list{max-height:34vh!important}}
  `;
  document.head.appendChild(css);

  const panel=document.createElement('section');
  panel.id='tygaRunningTrades';
  panel.innerHTML=`<div class="rt-head"><div class="rt-title">RUNNING TRADES <span id="tygaRTCount" class="rt-count">0</span></div><div class="rt-actions"><button id="tygaRTReload">↻</button><button id="tygaRTCollapse">−</button></div></div><div class="rt-body"><div class="rt-summary"><div class="rt-stat"><span>Open</span><b id="tygaRTOpen">0</b></div><div class="rt-stat"><span>Floating P/L</span><b id="tygaRTTotal">$0.00</b></div><div class="rt-stat"><span>Connection</span><b id="tygaRTConn">—</b></div></div><div id="tygaRTList" class="rt-list"><div class="rt-empty">Waiting for an authenticated trading connection…</div></div></div>`;
  document.body.appendChild(panel);

  const trades=new Map();
  const money=v=>{const n=Number(v);return Number.isFinite(n)?(n>=0?'+':'')+'$'+n.toFixed(2):'—'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ws(){return typeof tradingWs!=='undefined'?tradingWs:null}
  function ingest(p){if(!p||!p.contract_id)return;const id=String(p.contract_id);if(p.is_sold){trades.delete(id);render();return}trades.set(id,{...(trades.get(id)||{}),...p});render()}
  function requestPortfolio(){const w=ws();if(w&&w.readyState===1){try{w.send(JSON.stringify({portfolio:1}));}catch(_){}}}
  function requestContract(id){const w=ws();if(w&&w.readyState===1){try{w.send(JSON.stringify({proposal_open_contract:1,contract_id:Number(id),subscribe:1}));}catch(_){}}}
  function closeTrade(id){const w=ws();if(!w||w.readyState!==1){alert('Trading connection is not ready.');return}if(!confirm('Close this running trade now? Deriv will sell the contract at the current available price.'))return;const b=panel.querySelector('[data-close="'+CSS.escape(String(id))+'"]');if(b)b.disabled=true;try{w.send(JSON.stringify({sell:Number(id),price:0}));}catch(e){alert('Close request failed: '+e.message)}}

  function render(){const list=document.getElementById('tygaRTList'),arr=[...trades.values()];document.getElementById('tygaRTCount').textContent=arr.length;document.getElementById('tygaRTOpen').textContent=arr.length;const total=arr.reduce((s,p)=>s+(Number(p.profit)||0),0);const totalEl=document.getElementById('tygaRTTotal');totalEl.textContent=money(total);totalEl.className=total>=0?'rt-pos':'rt-neg';document.getElementById('tygaRTConn').textContent=ws()?.readyState===1?'CONNECTED':'OFFLINE';if(!arr.length){list.innerHTML='<div class="rt-empty">No running trades detected.</div>';return}list.innerHTML=arr.map(p=>{const pnl=Number(p.profit)||0;const id=String(p.contract_id);const symbol=p.underlying_symbol||p.symbol||'—';const type=p.contract_type||'Contract';const stake=p.buy_price??p.buy_price??p.amount;const spot=p.current_spot??p.exit_spot??p.entry_spot;return `<article class="rt-card"><div class="rt-card-head"><div><div class="rt-contract">${esc(symbol)} · ${esc(type)}</div><div class="rt-sub">Contract #${esc(id)}</div></div><div class="rt-pnl ${pnl>=0?'rt-pos':'rt-neg'}">${money(pnl)}</div></div><div class="rt-grid"><div><span>Stake</span><b>$${Number(stake||0).toFixed(2)}</b></div><div><span>Current</span><b>${spot!=null?esc(spot):'—'}</b></div><div><span>Entry</span><b>${p.entry_spot!=null?esc(p.entry_spot):'—'}</b></div><div><span>Status</span><b>${p.is_sold?'CLOSED':'RUNNING'}</b></div></div><button class="rt-close" data-close="${esc(id)}">CLOSE TRADE</button></article>`}).join('');list.querySelectorAll('.rt-close').forEach(b=>b.onclick=()=>closeTrade(b.getAttribute('data-close')))}

  function patchSocket(){const w=ws();if(!w||w.__tygaRTPatched)return false;const old=w.onmessage;w.onmessage=function(ev){try{const d=JSON.parse(ev.data);if(d.msg_type==='proposal_open_contract'&&!d.error)ingest(d.proposal_open_contract);if(d.msg_type==='portfolio'&&!d.error){(d.portfolio?.contracts||[]).forEach(c=>{if(c.contract_id)requestContract(c.contract_id)});}}catch(_){}return typeof old==='function'?old.apply(this,arguments):undefined};w.__tygaRTPatched=true;return true}

  document.getElementById('tygaRTReload').onclick=()=>{trades.clear();requestPortfolio();render()};
  document.getElementById('tygaRTCollapse').onclick=()=>{panel.classList.toggle('rt-collapsed');document.getElementById('tygaRTCollapse').textContent=panel.classList.contains('rt-collapsed')?'+':'−'};
  setInterval(()=>{if(patchSocket()){requestPortfolio()}render()},1500);
  setTimeout(()=>{patchSocket();requestPortfolio()},800);
  render();
})();
