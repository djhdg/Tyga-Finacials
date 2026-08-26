/* Tyga Financials — Telegram signal notifications
 * No Telegram credentials are stored in the repository.
 * Users enter their own bot token + chat ID in the app; values stay in localStorage.
 */
(() => {
  'use strict';
  const KEY = 'tygaTelegramConfigV1';
  const LAST = 'tygaTelegramLastSignalV1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = (v) => localStorage.setItem(KEY, JSON.stringify(v));
  const esc = (v) => String(v ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

  const style = document.createElement('style');
  style.textContent = `
    #tygaTelegramBtn{position:fixed;right:16px;bottom:88px;z-index:9999;border:1px solid var(--line,#362C5C);background:#229ED9;color:#fff;border-radius:12px;padding:10px 13px;font:700 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)}
    #tygaTelegramPanel{position:fixed;right:16px;bottom:142px;width:min(360px,calc(100vw - 32px));z-index:10000;background:var(--panel,#161331);color:var(--text,#F3F0FF);border:1px solid var(--line,#362C5C);border-radius:16px;padding:16px;box-shadow:0 16px 40px rgba(0,0,0,.35);display:none}
    #tygaTelegramPanel h3{margin:0 0 6px;font-size:15px}.tg-sub{font-size:11px;color:var(--muted,#8D84B8);margin-bottom:12px;line-height:1.45}
    .tg-field{margin:8px 0}.tg-field label{display:block;font-size:10px;color:var(--muted,#8D84B8);margin-bottom:4px}.tg-field input{width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:1px solid var(--line,#362C5C);background:var(--panel-hi,#211C42);color:var(--text,#F3F0FF)}
    .tg-row{display:flex;gap:8px;margin-top:10px}.tg-row button{flex:1;padding:10px;border-radius:9px;border:1px solid var(--line,#362C5C);font-weight:700;cursor:pointer}.tg-save{background:#229ED9;color:#fff;border-color:#229ED9!important}.tg-test{background:transparent;color:var(--text,#F3F0FF)}
    #tygaTelegramStatus{font-size:10px;margin-top:9px;min-height:14px;color:var(--muted,#8D84B8)}
  `;
  document.head.appendChild(style);

  function createUI(){
    if(document.getElementById('tygaTelegramBtn')) return;
    const btn = document.createElement('button');
    btn.id='tygaTelegramBtn'; btn.type='button'; btn.textContent='✈ Telegram';
    const panel=document.createElement('div'); panel.id='tygaTelegramPanel';
    panel.innerHTML=`<h3>Telegram Signals</h3><div class="tg-sub">Enter your Telegram bot credentials. They are saved only in this browser and are never committed to GitHub.</div>
      <div class="tg-field"><label>BOT TOKEN</label><input id="tgBotToken" type="password" autocomplete="off" placeholder="123456:ABC..." /></div>
      <div class="tg-field"><label>CHAT ID</label><input id="tgChatId" autocomplete="off" placeholder="-1001234567890" /></div>
      <div class="tg-row"><button class="tg-test" id="tgTest">Send test</button><button class="tg-save" id="tgSave">Save & enable</button></div>
      <div id="tygaTelegramStatus"></div>`;
    document.body.append(btn,panel);
    const cfg=load(); document.getElementById('tgBotToken').value=cfg.token||''; document.getElementById('tgChatId').value=cfg.chatId||'';
    btn.onclick=()=>{panel.style.display=panel.style.display==='block'?'none':'block';};
    document.getElementById('tgSave').onclick=()=>{const token=document.getElementById('tgBotToken').value.trim(),chatId=document.getElementById('tgChatId').value.trim(); if(!token||!chatId){setStatus('Enter both bot token and chat ID.',true);return;} save({token,chatId,enabled:true}); setStatus('Telegram notifications enabled.'); send('🟢 <b>Tyga Financials</b> Telegram alerts are now enabled.').catch(e=>setStatus(e.message,true));};
    document.getElementById('tgTest').onclick=()=>{const token=document.getElementById('tgBotToken').value.trim(),chatId=document.getElementById('tgChatId').value.trim(); if(!token||!chatId){setStatus('Enter both bot token and chat ID.',true);return;} send('🧪 <b>Tyga Financials</b> test message — Telegram connection is working.').then(()=>setStatus('Test message sent.')).catch(e=>setStatus(e.message,true));};
  }
  function setStatus(msg,error=false){const el=document.getElementById('tygaTelegramStatus');if(el){el.textContent=msg;el.style.color=error?'var(--sell,#FF4768)':'var(--buy,#2FE6A6)';}}
  async function send(text){
    const cfg=load(); if(!cfg.enabled||!cfg.token||!cfg.chatId) throw new Error('Telegram is not configured.');
    const r=await fetch(`https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cfg.chatId,text,parse_mode:'HTML',disable_web_page_preview:true})});
    const data=await r.json().catch(()=>({})); if(!r.ok||!data.ok) throw new Error(data.description||`Telegram error ${r.status}`); return data;
  }
  function getSignalText(){
    const candidates=[...document.querySelectorAll('.hero,.verdict,.signal-card,.signal,.signal-panel')];
    for(const el of candidates){
      const t=(el.innerText||'').replace(/\s+/g,' ').trim();
      if(/\b(BUY|SELL)\b/i.test(t)&&t.length<1800) return t;
    }
    return '';
  }
  let lastSeen=localStorage.getItem(LAST)||'';
  function check(){
    const t=getSignalText(); if(!t) return;
    const m=t.match(/\b(BUY|SELL)\b/i); if(!m) return;
    const normalized=t.slice(0,1500); const key=normalized;
    if(key===lastSeen) return;
    lastSeen=key; localStorage.setItem(LAST,key);
    const msg=`📊 <b>TYGA FINANCIALS SIGNAL</b>\n\n${esc(normalized)}`;
    const cfg=load(); if(cfg.enabled&&cfg.token&&cfg.chatId) send(msg).catch(()=>{});
  }
  function start(){createUI();setInterval(check,3000);setTimeout(check,2500);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
