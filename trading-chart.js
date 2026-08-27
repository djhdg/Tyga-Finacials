/* Tyga Financials — interactive TradingView-style canvas chart. */
(() => {
  'use strict';
  const boot = () => {
    if (window.__tygaInteractiveChart) return;
    if (typeof window.drawChart !== 'function') { setTimeout(boot, 100); return; }
    window.__tygaInteractiveChart = true;
    const state = { start:0, count:60, dragging:false, sx:0, sstart:0, initialized:false, symbol:null, lastCands:null, lastInfo:null, trades:{} };
    const canvasSize = canvas => { const dpr=devicePixelRatio||1,w=canvas.clientWidth||800,h=Math.max(320,Math.min(520,Math.round(w*.42)));canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.height=h+'px';const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h}; };
    const priceFmt = v => { if(!Number.isFinite(v)) return '—'; const a=Math.abs(v),dp=a>=100?2:a>=1?4:6; return v.toFixed(dp); };
    const timeFmt = c => { if(!c) return ''; const d=new Date((c.epoch||c.time||0)*1000); return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); };
    function draw(cands,info){
      const canvas=document.getElementById('chart'); if(!canvas||!Array.isArray(cands)||cands.length<2)return;
      const symbol=document.querySelector('.tab.active')?.textContent?.trim()||'market';
      if(state.symbol!==symbol){state.symbol=symbol;state.initialized=false;state.trades[symbol]=null;}
      state.lastCands=cands;state.lastInfo=info||{};
      const {ctx,w,h}=canvasSize(canvas),pad={l:62,r:70,t:18,b:30},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
      if(!state.initialized){state.count=Math.min(60,cands.length);state.start=Math.max(0,cands.length-state.count);state.initialized=true;}
      state.count=Math.max(20,Math.min(state.count,cands.length));state.start=Math.max(0,Math.min(state.start,cands.length-state.count));
      const view=cands.slice(state.start,state.start+state.count),lo=Math.min(...view.map(x=>x.low)),hi=Math.max(...view.map(x=>x.high));let min=lo,max=hi,range=(hi-lo)||Math.max(Math.abs(hi)*.002,1);min-=range*.08;max+=range*.08;
      [info?.entry,info?.sl,...(info?.tps||[])].filter(Number.isFinite).forEach(v=>{min=Math.min(min,v);max=Math.max(max,v)});
      const y=p=>pad.t+(max-p)/(max-min)*ph,x=i=>pad.l+(i+.5)/view.length*pw;
      ctx.clearRect(0,0,w,h);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--panel').trim()||'#10182b';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(130,150,190,.13)';ctx.lineWidth=1;ctx.font='10px ui-monospace,monospace';ctx.fillStyle='rgba(170,185,210,.7)';
      for(let g=0;g<=5;g++){const yy=pad.t+ph*g/5;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillText(priceFmt(max-(max-min)*g/5),w-pad.r+8,yy+3);}
      const step=Math.max(1,Math.ceil(view.length/6));for(let i=0;i<view.length;i+=step)ctx.fillText(timeFmt(view[i]),Math.max(pad.l,x(i)-18),h-8);
      const bodyW=Math.max(2,pw/view.length*.72);view.forEach((c,i)=>{const up=c.close>=c.open,xx=x(i),yo=y(c.open),yc=y(c.close),yh=y(c.high),yl=y(c.low);ctx.strokeStyle=up?'#2FE6A6':'#FF4768';ctx.fillStyle=up?'#2FE6A6':'#FF4768';ctx.beginPath();ctx.moveTo(xx,yh);ctx.lineTo(xx,yl);ctx.stroke();ctx.fillRect(xx-bodyW/2,Math.min(yo,yc),bodyW,Math.max(2,Math.abs(yc-yo)));});
      const line=(price,label,color)=>{if(!Number.isFinite(price)||price<min||price>max)return;const yy=y(price);ctx.save();ctx.strokeStyle=color;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.fillRect(w-pad.r+2,yy-9,66,18);ctx.fillStyle='#071019';ctx.font='700 9px ui-monospace,monospace';ctx.fillText(label+' '+priceFmt(price),w-pad.r+5,yy+3);ctx.restore();};
      if(info?.entry!=null)line(info.entry,'OPEN','#22D3EE');if(info?.sl!=null)line(info.sl,'SL','#FF4768');(info?.tps||[]).forEach((p,i)=>line(p,'TP'+(i+1),'#2FE6A6'));
      const old=state.trades[symbol];if(info?.pos){state.trades[symbol]={...old,call:info.pos.call||info.call||'BUY',entry:Number(info.pos.entry),openIndex:cands.length-1,closed:false};}else if(old&&!old.closed){old.closed=true;old.closeIndex=cands.length-1;old.closePrice=cands[cands.length-1].close;old.result=((old.call==='BUY'&&old.closePrice>=old.entry)||(old.call==='SELL'&&old.closePrice<=old.entry))?'WIN':'LOSS';}
      const tr=state.trades[symbol];
      if(tr){const marker=(idx,price,title,sub,color)=>{const rel=idx-state.start;if(rel<0||rel>=view.length||!Number.isFinite(price))return;const xx=x(rel),yy=y(price),bw=132,bh=36,bx=Math.min(Math.max(xx+8,pad.l),w-pad.r-bw),by=Math.max(pad.t,Math.min(yy-18,h-pad.b-bh));ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.arc(xx,yy,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(5,10,20,.96)';ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.font='800 9px system-ui';ctx.fillText(title,bx+7,by+12);ctx.fillStyle='#eef7ff';ctx.font='700 10px ui-monospace,monospace';ctx.fillText(priceFmt(price),bx+7,by+26);ctx.fillStyle='rgba(220,230,245,.7)';ctx.font='8px system-ui';ctx.fillText(sub||'',bx+66,by+12);ctx.restore();};marker(tr.openIndex,tr.entry,'POSITION OPEN',tr.call||'',tr.call==='SELL'?'#FF4768':'#2FE6A6');if(tr.closed)marker(tr.closeIndex,tr.closePrice,'POSITION CLOSED',tr.result||'',tr.result==='WIN'?'#2FE6A6':'#FF4768');}
      ctx.fillStyle='rgba(220,230,245,.72)';ctx.font='700 9px system-ui';ctx.fillText('Drag to pan • Wheel/trackpad to zoom',pad.l,12);
    }
    window.drawChart=draw;
    const bind=()=>{const canvas=document.getElementById('chart');if(!canvas){setTimeout(bind,200);return;}if(canvas.__tygaBound)return;canvas.__tygaBound=true;canvas.style.cursor='grab';
      const redraw=()=>{if(state.lastCands)draw(state.lastCands,state.lastInfo||{});};
      canvas.addEventListener('pointerdown',e=>{state.dragging=true;state.sx=e.clientX;state.sstart=state.start;canvas.setPointerCapture?.(e.pointerId);canvas.style.cursor='grabbing';});
      canvas.addEventListener('pointermove',e=>{if(!state.dragging||!state.lastCands)return;const px=(canvas.clientWidth||800)/Math.max(state.count,1),delta=Math.round((e.clientX-state.sx)/Math.max(px,1));state.start=Math.max(0,Math.min(state.sstart-delta,Math.max(0,state.lastCands.length-state.count)));redraw();});
      const end=e=>{state.dragging=false;canvas.style.cursor='grab';try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
      canvas.addEventListener('wheel',e=>{e.preventDefault();if(!state.lastCands)return;const old=state.count,next=Math.max(20,Math.min(state.lastCands.length,Math.round(old*Math.exp(e.deltaY*.0015)))),r=canvas.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),anchor=state.start+Math.round(ratio*old);state.count=next;state.start=Math.max(0,Math.min(anchor-Math.round(ratio*next),state.lastCands.length-next));redraw();},{passive:false});
      const controls=document.createElement('div');controls.className='tyga-chart-controls';controls.innerHTML='<button data-z="in">＋</button><button data-z="out">－</button><button data-z="reset">Reset</button><span>Drag / scroll to navigate history</span>';canvas.parentElement?.appendChild(controls);
      controls.querySelector('[data-z="in"]').onclick=()=>{if(!state.lastCands)return;state.count=Math.max(20,Math.round(state.count*.75));state.start=Math.min(state.start,state.lastCands.length-state.count);redraw();};
      controls.querySelector('[data-z="out"]').onclick=()=>{if(!state.lastCands)return;const anchor=state.start+Math.round(state.count/2);state.count=Math.min(state.lastCands.length,Math.round(state.count/0.75));state.start=Math.max(0,Math.min(anchor-Math.round(state.count/2),state.lastCands.length-state.count));redraw();};
      controls.querySelector('[data-z="reset"]').onclick=()=>{if(!state.lastCands)return;state.count=Math.min(60,state.lastCands.length);state.start=Math.max(0,state.lastCands.length-state.count);redraw();};
      const style=document.createElement('style');style.textContent='.chart-card{overflow:visible!important}.chart-card canvas{touch-action:none;user-select:none}.tyga-chart-controls{display:flex;gap:6px;align-items:center;margin-top:7px}.tyga-chart-controls button{border:1px solid var(--line);background:var(--bg);color:var(--text);border-radius:7px;padding:5px 9px;font:700 11px ui-monospace,monospace}.tyga-chart-controls span{margin-left:auto;color:var(--muted);font:10px ui-monospace,monospace}';document.head.appendChild(style);
    };bind();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
