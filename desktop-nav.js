/* Tyga Financials — desktop navigation mapped directly to the app's real mobile views. */
(() => {
  'use strict';
  if (window.innerWidth < 900 || document.getElementById('tygaDesktopNav')) return;
  const items=[['digits','⌁','Digits'],['signals','◈','Signals'],['news','◉','News'],['journal','▤','Journal'],['upgrade','◆','Upgrade'],['account','●','Account']];
  const style=document.createElement('style');style.textContent=`@media(min-width:900px){#tygaDesktopNav{position:fixed;right:18px;top:50%;transform:translateY(-50%);width:94px;z-index:99999;display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid rgba(94,160,255,.22);border-radius:22px;background:rgba(10,15,28,.97);backdrop-filter:blur(20px);box-shadow:0 18px 55px rgba(0,0,0,.5);transition:width .22s ease,padding .22s ease}#tygaDesktopNav .tdn-item{width:76px;min-height:64px;padding:7px 4px;border:1px solid transparent;border-radius:15px;background:transparent;color:#9AAAC4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:700 10px system-ui;cursor:pointer}#tygaDesktopNav .tdn-item .tdn-icon{font-size:20px;line-height:1;color:#7E8EA8}#tygaDesktopNav .tdn-item:hover{color:#F7FAFF;background:rgba(34,211,238,.07);border-color:rgba(34,211,238,.22)}#tygaDesktopNav .tdn-item.active{color:#fff;background:linear-gradient(145deg,rgba(34,211,238,.18),rgba(167,139,250,.14));border-color:rgba(34,211,238,.42)}#tygaDesktopNav .tdn-item.active .tdn-icon{color:#22D3EE}body{padding-right:130px!important;transition:padding-right .22s ease}#tygaDesktopNav:before{content:'TYGA';position:absolute;top:-31px;left:0;width:100%;text-align:center;color:#22D3EE;font:800 10px system-ui;letter-spacing:.18em}#tygaDesktopNav .tdn-toggle{position:absolute;right:-14px;top:-14px;width:34px;height:34px;border:2px solid rgba(34,211,238,.7);border-radius:50%;background:#08111f;color:#22D3EE;display:flex;align-items:center;justify-content:center;font:900 19px system-ui;cursor:pointer;z-index:100001;pointer-events:auto}#tygaDesktopNav.is-collapsed{width:44px;padding:7px 5px;gap:4px}#tygaDesktopNav.is-collapsed .tdn-item{width:34px;min-height:40px;padding:4px}#tygaDesktopNav.is-collapsed .tdn-label,#tygaDesktopNav.is-collapsed:before{display:none}#tygaDesktopNav.is-collapsed .tdn-item .tdn-icon{font-size:17px}body.tyga-nav-collapsed{padding-right:72px!important}}`;document.head.appendChild(style);
  const nav=document.createElement('aside');nav.id='tygaDesktopNav';nav.setAttribute('aria-label','Tyga Financials navigation');
  const toggle=document.createElement('button');toggle.className='tdn-toggle';toggle.type='button';toggle.textContent='›';toggle.setAttribute('aria-label','Collapse navigation');toggle.title='Collapse navigation';nav.appendChild(toggle);
  const setCollapsed=v=>{nav.classList.toggle('is-collapsed',v);document.body.classList.toggle('tyga-nav-collapsed',v);toggle.textContent=v?'‹':'›';toggle.setAttribute('aria-label',v?'Expand navigation':'Collapse navigation');toggle.title=v?'Expand navigation':'Collapse navigation';try{localStorage.setItem('tygaDesktopNavCollapsed',v?'1':'0')}catch(e){}};

  const aliases={digits:['digits','digit','analysis','volatility'],signals:['signals','signal','forecast'],news:['news'],journal:['journal','history'],upgrade:['upgrade','automation','deriv'],account:['account','profile','settings']};
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const wordsFor=key=>aliases[key]||[key];
  function score(el,key){
    const text=norm([el.id,el.name,el.value,el.getAttribute('data-view'),el.getAttribute('data-section'),el.getAttribute('aria-label'),el.getAttribute('title'),el.innerText,el.textContent].join(' '));
    let n=0;
    for(const w of wordsFor(key)){if(text===w)n=Math.max(n,100);else if(new RegExp('(^| )'+w+'( |$)').test(text))n=Math.max(n,90);else if(text.includes(w))n=Math.max(n,35)}
    if(el.classList.contains('nav-item'))n+=100;
    return n;
  }
  function realMobileNav(key){
    // The mobile app's .bottom-nav contains the authoritative view-switching buttons.
    const controls=[...document.querySelectorAll('.bottom-nav .nav-item, button.nav-item, .nav-item')]
      .filter(el=>el.closest('#tygaDesktopNav')===null);
    return controls.map(el=>({el,n:score(el,key)})).sort((a,b)=>b.n-a.n)[0]||null;
  }
  function activate(key){
    document.querySelectorAll('#tygaDesktopNav .tdn-item').forEach(x=>x.classList.toggle('active',x.dataset.section===key));

    // IMPORTANT: do not require the mobile nav to be visible. Desktop CSS may hide it,
    // but its click handlers are still the canonical app navigation logic.
    const mobile=realMobileNav(key);
    if(mobile && mobile.n>=120){
      mobile.el.click();
      setTimeout(()=>syncFromApp(),80);
      return;
    }

    // Fallback for apps whose navigation is not exposed as .nav-item.
    const all=[...document.querySelectorAll('button,a,[role="tab"]')].filter(el=>el.closest('#tygaDesktopNav')===null);
    const control=all.map(el=>({el,n:score(el,key)})).sort((a,b)=>b.n-a.n)[0];
    if(control && control.n>=90){control.el.click();setTimeout(()=>syncFromApp(),80);return}

    // Last fallback: directly activate a matching .view.
    const views=[...document.querySelectorAll('.view,[data-view]')].filter(el=>el.closest('#tygaDesktopNav')===null);
    const target=views.map(el=>({el,n:score(el,key)})).sort((a,b)=>b.n-a.n)[0];
    if(target && target.n>0){views.forEach(v=>v.classList.remove('active'));target.el.classList.add('active');target.el.scrollIntoView({behavior:'smooth',block:'start'});syncFromApp();}
  }
  function syncFromApp(){
    const active=document.querySelector('.bottom-nav .nav-item.active,.nav-item.active');
    if(!active)return;
    const s=norm(active.innerText||active.textContent);const found=items.find(([k,,label])=>s.includes(label.toLowerCase()));
    if(found)document.querySelectorAll('#tygaDesktopNav .tdn-item').forEach(x=>x.classList.toggle('active',x.dataset.section===found[0]));
  }

  items.forEach(([key,icon,label])=>{const b=document.createElement('button');b.className='tdn-item';b.type='button';b.dataset.section=key;b.innerHTML='<span class="tdn-icon">'+icon+'</span><span class="tdn-label">'+label+'</span>';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activate(key)});nav.appendChild(b)});
  document.body.appendChild(nav);
  let saved=false;try{saved=localStorage.getItem('tygaDesktopNavCollapsed')==='1'}catch(e){}setCollapsed(saved);
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();setCollapsed(!nav.classList.contains('is-collapsed'))});
  syncFromApp();
})();
