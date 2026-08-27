(() => {
  'use strict';
  if (innerWidth < 900 || document.getElementById('tygaLeftRailFix')) return;
  const style=document.createElement('style');
  style.id='tygaLeftRailFix';
  style.textContent=`@media(min-width:900px){.tyga-left-rail-target{transition:transform .22s ease,width .22s ease,opacity .18s ease!important}.tyga-left-rail-target.tyga-left-collapsed{transform:translateX(-115%)!important;opacity:0!important;pointer-events:none!important}.tyga-left-toggle{position:fixed;left:12px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;border:2px solid rgba(34,211,238,.72);background:#08111f;color:#22D3EE;font:900 20px system-ui;z-index:1000002;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 25px rgba(0,0,0,.5),0 0 18px rgba(34,211,238,.15)}.tyga-left-toggle:hover{transform:translateY(-50%) scale(1.06)}.tyga-left-toggle.tyga-expanded{left:78px}.tyga-left-collapsed-target{display:none!important}body.tyga-left-collapsed{padding-left:8px!important}.tyga-left-label{position:fixed;left:52px;top:calc(50% + 23px);z-index:1000001;color:#7f91ad;font:700 9px system-ui;letter-spacing:.08em;pointer-events:none;opacity:.8}}`;
  document.head.appendChild(style);
  const isCandidate=el=>{
    if(!el||el===document.body||el===document.documentElement)return false;
    if(el.id==='tygaDesktopNav'||el.id==='tygaDesktopWorkspace'||el.id==='tygaDesktopBadge')return false;
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    return r.left<=80 && r.width>=18 && r.width<=115 && r.height>=220 && (cs.position==='fixed'||cs.position==='sticky') && parseInt(cs.zIndex||'0',10)>=10;
  };
  const find=()=>[...document.body.querySelectorAll('*')].filter(isCandidate).sort((a,b)=>a.getBoundingClientRect().height-b.getBoundingClientRect().height).pop()||null;
  let target=null;
  const attach=()=>{
    if(target&&document.body.contains(target))return;
    target=find(); if(!target)return;
    target.classList.add('tyga-left-rail-target');
    const btn=document.createElement('button');btn.type='button';btn.className='tyga-left-toggle';btn.textContent='‹';btn.title='Collapse left floating panel';btn.setAttribute('aria-label','Collapse left floating panel');
    const label=document.createElement('span');label.className='tyga-left-label';label.textContent='PANEL';document.body.appendChild(label);document.body.appendChild(btn);
    let collapsed=false;try{collapsed=localStorage.getItem('tygaLeftRailCollapsed')==='1'}catch(e){}
    const apply=()=>{target.classList.toggle('tyga-left-collapsed',collapsed);btn.classList.toggle('tyga-expanded',!collapsed);btn.textContent=collapsed?'›':'‹';btn.title=collapsed?'Expand left floating panel':'Collapse left floating panel';btn.setAttribute('aria-label',btn.title);label.style.display=collapsed?'none':'block';document.body.classList.toggle('tyga-left-collapsed',collapsed);try{localStorage.setItem('tygaLeftRailCollapsed',collapsed?'1':'0')}catch(e){}};
    apply();btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();collapsed=!collapsed;apply()},{capture:true});
  };
  let tries=0;const timer=setInterval(()=>{attach();if(++tries>30)clearInterval(timer)},500);attach();
})();
