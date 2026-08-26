/* Tyga Financials — desktop navigation mirror
 * Keeps the existing mobile sections/features and adds a right-side desktop switcher.
 */
(() => {
  'use strict';
  if (window.innerWidth < 900 || document.getElementById('tygaDesktopNav')) return;

  const items = [
    ['digits','⌁','Digits'],
    ['signals','◈','Signals'],
    ['news','◉','News'],
    ['journal','▤','Journal'],
    ['upgrade','◆','Upgrade'],
    ['account','●','Account']
  ];

  const style=document.createElement('style');
  style.textContent=`
  @media(min-width:900px){
    #tygaDesktopNav{position:fixed;right:18px;top:50%;transform:translateY(-50%);width:94px;z-index:9500;display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid rgba(94,160,255,.22);border-radius:22px;background:rgba(10,15,28,.84);backdrop-filter:blur(20px);box-shadow:0 18px 55px rgba(0,0,0,.38),0 0 35px rgba(34,211,238,.04)}
    #tygaDesktopNav .tdn-item{width:76px;min-height:64px;padding:7px 4px;border:1px solid transparent;border-radius:15px;background:transparent;color:#9AAAC4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:700 10px system-ui;cursor:pointer;transition:.18s ease}
    #tygaDesktopNav .tdn-item .tdn-icon{font-size:20px;line-height:1;color:#7E8EA8}
    #tygaDesktopNav .tdn-item:hover{color:#F7FAFF;background:rgba(34,211,238,.07);border-color:rgba(34,211,238,.22);transform:translateX(-2px)}
    #tygaDesktopNav .tdn-item.active{color:#fff;background:linear-gradient(145deg,rgba(34,211,238,.18),rgba(167,139,250,.14));border-color:rgba(34,211,238,.42);box-shadow:0 0 24px rgba(34,211,238,.10),inset 0 0 18px rgba(34,211,238,.05)}
    #tygaDesktopNav .tdn-item.active .tdn-icon{color:#22D3EE;text-shadow:0 0 14px rgba(34,211,238,.7)}
    #tygaDesktopNav .tdn-label{font-size:9px;letter-spacing:.04em}
    body{padding-right:130px!important}
    #tygaDesktopNav:before{content:'TYGA';position:absolute;top:-31px;left:0;width:100%;text-align:center;color:#22D3EE;font:800 10px system-ui;letter-spacing:.18em;text-shadow:0 0 12px rgba(34,211,238,.45)}
  }
  `;
  document.head.appendChild(style);

  const nav=document.createElement('aside'); nav.id='tygaDesktopNav'; nav.setAttribute('aria-label','Tyga Financials navigation');
  items.forEach(([key,icon,label])=>{
    const b=document.createElement('button'); b.className='tdn-item'; b.dataset.section=key; b.innerHTML=`<span class="tdn-icon">${icon}</span><span class="tdn-label">${label}</span>`;
    b.addEventListener('click',()=>activate(key)); nav.appendChild(b);
  });
  document.body.appendChild(nav);

  function allSections(){return [...document.querySelectorAll('section,main > div,[id*="screen"],[id*="view"],[id*="panel"],[id*="page"]')];}
  const patterns={
    digits:/digits|digit|volatility|tick/i,
    signals:/signals?|signal|forecast|analysis/i,
    news:/news|market news/i,
    journal:/journal|trade journal|history/i,
    upgrade:/upgrade|auto.?execute|deriv|automation/i,
    account:/account|profile|settings/i
  };
  function activate(key){
    document.querySelectorAll('#tygaDesktopNav .tdn-item').forEach(x=>x.classList.toggle('active',x.dataset.section===key));
    const candidates=allSections();
    const matches=candidates.filter(el=>{const text=((el.id||'')+' '+(el.className||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.innerText||'').slice(0,300));return patterns[key].test(text)});
    const target=matches.find(el=>el.offsetParent!==null)||matches[0];
    if(target){target.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const buttons=[...document.querySelectorAll('button,a,[role="tab"]')];
    const trigger=buttons.find(el=>patterns[key].test((el.innerText||'')+' '+(el.getAttribute('aria-label')||'')));
    if(trigger) trigger.click();
  }
  const sync=()=>{const y=window.scrollY+window.innerHeight*.35;let best='signals',bestTop=Infinity;for(const [key,re] of Object.entries(patterns)){for(const el of allSections()){const t=((el.id||'')+' '+(el.className||'')+' '+(el.innerText||'').slice(0,250));if(re.test(t)){const top=Math.abs(el.getBoundingClientRect().top+window.scrollY-y);if(top<bestTop){bestTop=top;best=key;}}}}document.querySelectorAll('#tygaDesktopNav .tdn-item').forEach(x=>x.classList.toggle('active',x.dataset.section===best));};
  window.addEventListener('scroll',sync,{passive:true}); sync();
})();
