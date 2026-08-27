/* Tyga Financials — desktop navigation with real view switching and collapse/expand. */
(() => {
  'use strict';
  if (window.innerWidth < 900 || document.getElementById('tygaDesktopNav')) return;
  const items=[['digits','⌁','Digits'],['signals','◈','Signals'],['news','◉','News'],['journal','▤','Journal'],['upgrade','◆','Upgrade'],['account','●','Account']];
  const style=document.createElement('style');style.textContent=`@media(min-width:900px){#tygaDesktopNav{position:fixed;right:18px;top:50%;transform:translateY(-50%);width:94px;z-index:99999;display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid rgba(94,160,255,.22);border-radius:22px;background:rgba(10,15,28,.96);backdrop-filter:blur(20px);box-shadow:0 18px 55px rgba(0,0,0,.5);transition:width .22s ease,padding .22s ease}#tygaDesktopNav .tdn-item{width:76px;min-height:64px;padding:7px 4px;border:1px solid transparent;border-radius:15px;background:transparent;color:#9AAAC4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:700 10px system-ui;cursor:pointer}#tygaDesktopNav .tdn-item .tdn-icon{font-size:20px;line-height:1;color:#7E8EA8}#tygaDesktopNav .tdn-item:hover{color:#F7FAFF;background:rgba(34,211,238,.07);border-color:rgba(34,211,238,.22)}#tygaDesktopNav .tdn-item.active{color:#fff;background:linear-gradient(145deg,rgba(34,211,238,.18),rgba(167,139,250,.14));border-color:rgba(34,211,238,.42)}#tygaDesktopNav .tdn-item.active .tdn-icon{color:#22D3EE}body{padding-right:130px!important;transition:padding-right .22s ease}#tygaDesktopNav:before{content:'TYGA';position:absolute;top:-31px;left:0;width:100%;text-align:center;color:#22D3EE;font:800 10px system-ui;letter-spacing:.18em}#tygaDesktopNav .tdn-toggle{position:absolute;right:-14px;top:-14px;width:34px;height:34px;border:2px solid rgba(34,211,238,.7);border-radius:50%;background:#08111f;color:#22D3EE;display:flex;align-items:center;justify-content:center;font:900 19px system-ui;cursor:pointer;z-index:100001;pointer-events:auto}#tygaDesktopNav.is-collapsed{width:44px;padding:7px 5px;gap:4px}#tygaDesktopNav.is-collapsed .tdn-item{width:34px;min-height:40px;padding:4px}#tygaDesktopNav.is-collapsed .tdn-label,#tygaDesktopNav.is-collapsed:before{display:none}#tygaDesktopNav.is-collapsed .tdn-item .tdn-icon{font-size:17px}body.tyga-nav-collapsed{padding-right:72px!important}}`;document.head.appendChild(style);
  const nav=document.createElement('aside');nav.id='tygaDesktopNav';nav.setAttribute('aria-label','Tyga Financials navigation');
  const toggle=document.createElement('button');toggle.className='tdn-toggle';toggle.type='button';toggle.textContent='›';toggle.setAttribute('aria-label','Collapse navigation');toggle.title='Collapse navigation';nav.appendChild(toggle);
  const setCollapsed=v=>{nav.classList.toggle('is-collapsed',v);document.body.classList.toggle('tyga-nav-collapsed',v);toggle.textContent=v?'‹':'›';toggle.setAttribute('aria-label',v?'Expand navigation':'Collapse navigation');toggle.title=v?'Expand navigation':'Collapse navigation';try{localStorage.setItem('tygaDesktopNavCollapsed',v?'1':'0')}catch(e){}};

  // These aliases match the names commonly used by the app's existing mobile view/nav code.
  const aliases={digits:['digits','digit','analysis','volatility'],signals:['signals','signal','forecast'],news:['news'],journal:['journal','history'],upgrade:['upgrade','automation','deriv'],account:['account','profile','settings']};
  function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function score(el,key){
    const hay=norm([el.id,el.getAttribute('data-view'),el.getAttribute('data-section'),el.getAttribute('aria-label'),el.getAttribute('title'),el.innerText].join(' '));
    const words=aliases[key]; let n=0;
    words.forEach(w=>{if(hay===w)n+=100;if(hay.includes(' '+w+' '))n+=50;if(hay.includes(w))n+=10});
    if(el.classList.contains('view'))n+=30;if(el.classList.contains('nav-item'))n+=80;
    if(key==='signals' && /signal/.test(hay))n+=20;
    return n;
  }
  function activate(key){
    document.querySelectorAll('#tygaDesktopNav .tdn-item').forEach(x=>x.classList.toggle('active',x.dataset.section===key));

    // 1) Prefer the application's own navigation controls. This is the important part:
    // clicking the desktop item now invokes the same view-switching handler as mobile.
    const controls=[...document.querySelectorAll('button:not(#tygaDesktopNav button),a,[role="tab"]')]
      .filter(el=>el.closest('#tygaDesktopNav')===null && el.offsetParent!==null);
    const control=controls.map(el=>({el,n:score(el,key)})).sort((a,b)=>b.n-a.n)[0];
    if(control && control.n>=50){control.el.click();setTimeout(()=>syncActive(key),60);return}

    // 2) If no mobile control is found, switch .view/.active directly.
    const views=[...document.querySelectorAll('.view,[data-view]')].filter(el=>el.closest('#tygaDesktopNav')===null);
    const target=views.map(el=>({el,n:score(el,key)})).sort((a,b)=>b.n-a.n)[0];
    if(target && target.n>0){views.forEach(v=>v.classList.remove('active'));target.el.classList.add('active');target.el.scrollIntoView({behavior:'smooth',block:'start'});syncActive(key);return}

    // 3) Last fallback: scroll to the best matching content section.
    const sections=[...document.querySelectorAll('main section,body > section,body > main > div,section[id]')].filter(el=>el.closest('#tygaDesktopNav')===null);
    const section=sections.map(el=>({el,n:score(el,key)})).sort((a,b)=>b.n-a.n)[0];
    if(section && section.n>0){section.el.scrollIntoView({behavior:'smooth',block:'start'});syncActive(key)}
  }
  function syncActive(key){document.querySelectorAll('#tygaDesktopNav .tdn-item').forEach(x=>x.classList.toggle('active',x.dataset.section===key))}

  items.forEach(([key,icon,label])=>{const b=document.createElement('button');b.className='tdn-item';b.type='button';b.dataset.section=key;b.innerHTML='<span class="tdn-icon">'+icon+'</span><span class="tdn-label">'+label+'</span>';b.addEventListener('click',()=>activate(key));nav.appendChild(b)});
  document.body.appendChild(nav);
  let saved=false;try{saved=localStorage.getItem('tygaDesktopNavCollapsed')==='1'}catch(e){}setCollapsed(saved);
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();setCollapsed(!nav.classList.contains('is-collapsed'))});
  const defaultKey='signals';syncActive(defaultKey);
})();
