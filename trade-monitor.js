/* Tyga Financials — MT5-style running trade monitor for Deriv contracts. */
(() => {
  'use strict';
  if (window.TygaTradeMonitor) return;
  const trades = new Map();
  let ws = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '—';
  function pnl(t){ return Number(t.profit_loss ?? t.profit ?? 0); }
  function isOpen(t){ return t && !t.is_sold && t.status !== 'sold'; }
  function label(t){ return t.display_name || t.longcode || t.contract_type || t.symbol || `Contract ${t.contract_id}`; }
  function render(){
    const body=document.getElementById('tygaTradesBody'),count=document.getElementById('tygaTradeCount'),pl=document.getElementById('tygaTradePL');
    if(!body)return;
    const open=[...trades.values()].filter(isOpen);
    count.textContent=String(open.length);
    const total=open.reduce((s,t)=>s+pnl(t),0);pl.textContent=`P/L ${total>=0?'+':''}$${money(total)}`;pl.className=total>=0?'tm-win':'tm-loss';
    if(!open.length){body.innerHTML='<div class="tm-empty">No running trades</div>';return}
    body.innerHTML=open.map(t=>{const p=pnl(t),price=t.bid_price ?? t.exit_tick_display_value ?? t.current_spot ?? t.spot;return `<div class="tm-trade"><div class="tm-main"><div class="tm-name">${esc(label(t))}</div><div class="tm-meta">#${esc(t.contract_id)} · ${esc(t.symbol||'')} · Stake $${money(t.buy_price??t.buy_price_display_value??t.amount)}</div><div class="tm-price">Current ${esc(price??'—')} <span class="${p>=0?'tm-win':'tm-loss'}">${p>=0?'+':''}$${money(p)}</span></div></div><button class="tm-close" data-contract="${esc(t.contract_id)}">CLOSE</button></div>`}).join('');
    body.querySelectorAll('.tm-close').forEach(b=>b.onclick=()=>closeTrade(b.dataset.contract));
  }
  function ensurePanel(){
    if(document.getElementById('tygaTradeMonitor'))return;
    const s=document.createElement('style');s.textContent=`#tygaTradeMonitor{position:fixed;left:16px;right:16px;bottom:16px;z-index:10000;max-width:720px;margin:auto;background:rgba(8,13,25,.98);border:1px solid rgba(94,160,255,.25);border-radius:16px;box-shadow:0 18px 55px rgba(0,0,0,.45);font:12px system-ui;color:#f7faff;overflow:hidden}.tm-head{display:flex;align-items:center;gap:10px;padding:11px 13px;background:rgba(17,26,45,.96)}.tm-title{font-weight:900;letter-spacing:.04em}.tm-count{min-width:20px;text-align:center;padding:3px 6px;border-radius:99px;background:#263a5c;font-size:10px}.tm-pl{margin-left:auto;font-weight:900}.tm-win{color:#20f2a0}.tm-loss{color:#ff4d78}.tm-refresh,.tm-collapse{border:1px solid #29405f;background:#10172a;color:#f7faff;border-radius:8px;padding:5px 8px;font-weight:800;cursor:pointer}.tm-body{max-height:300px;overflow:auto}.tm-empty{padding:20px;text-align:center;color:#9aaac4}.tm-trade{display:flex;gap:12px;align-items:center;padding:11px 13px;border-top:1px solid rgba(94,160,255,.12)}.tm-main{min-width:0;flex:1}.tm-name{font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tm-meta{color:#9aaac4;font-size:10px;margin-top:3px}.tm-price{margin-top:5px;font-weight:750}.tm-price span{margin-left:10px}.tm-close{border:1px solid #ff4d78;background:rgba(255,77,120,.08);color:#ff4d78;border-radius:8px;padding:7px 9px;font-size:10px;font-weight:900;cursor:pointer}.tm-collapsed .tm-body{display:none}.tm-collapsed{max-width:390px}.tm-collapsed .tm-collapse{margin-left:auto}@media(max-width:600px){#tygaTradeMonitor{left:8px;right:8px;bottom:74px}.tm-body{max-height:240px}}`;document.head.appendChild(s);
    const p=document.createElement('div');p.id='tygaTradeMonitor';p.innerHTML='<div class="tm-head"><span class="tm-title">RUNNING TRADES</span><span id="tygaTradeCount" class="tm-count">0</span><span id="tygaTradePL" class="tm-pl tm-win">P/L +$0.00</span><button id="tygaTradeRefresh" class="tm-refresh">↻</button><button id="tygaTradeCollapse" class="tm-collapse">−</button></div><div id="tygaTradesBody" class="tm-body"></div>';document.body.appendChild(p);
    document.getElementById('tygaTradeRefresh').onclick=refresh;
    document.getElementById('tygaTradeCollapse').onclick=()=>{p.classList.toggle('tm-collapsed');document.getElementById('tygaTradeCollapse').textContent=p.classList.contains('tm-collapsed')?'+':'−'};
    render();
  }
  function send(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));}
  function refresh(){send({portfolio:1});}
  function closeTrade(id){if(!id)return;if(!confirm(`Close contract ${id} at the current market price?`))return;send({sell:String(id),price:0});}
  function ingest(m){
    if(m.msg_type==='portfolio' && Array.isArray(m.portfolio?.contracts)){m.portfolio.contracts.forEach(t=>{if(t.contract_id)trades.set(String(t.contract_id),t)});render();}
    if(m.msg_type==='proposal_open_contract' && m.proposal_open_contract?.contract_id){const t=m.proposal_open_contract;trades.set(String(t.contract_id),t);if(t.is_sold||t.status==='sold')setTimeout(()=>{trades.delete(String(t.contract_id));render()},500);render();}
    if(m.msg_type==='buy' && m.buy?.contract_id)send({proposal_open_contract:1,contract_id:m.buy.contract_id,subscribe:1});
    if(m.msg_type==='sell' && m.sell?.contract_id){trades.delete(String(m.sell.contract_id));render();}
    if(m.error){console.warn('[TygaTradeMonitor]',m.error);}
  }
  const OriginalWebSocket=window.WebSocket;
  function WrappedWebSocket(...args){const socket=new OriginalWebSocket(...args);ws=socket;socket.addEventListener('open',()=>setTimeout(refresh,350));socket.addEventListener('message',e=>{try{ingest(JSON.parse(e.data))}catch(_){}});return socket}
  WrappedWebSocket.prototype=OriginalWebSocket.prototype;window.WebSocket=WrappedWebSocket;
  window.TygaTradeMonitor={refresh,close:closeTrade,version:'1.0.0',trades};
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();ready(ensurePanel);
})();
