/* Tyga Financials — scalping quality layer.
 * Filters signals by market regime, higher-timeframe direction, volatility and
 * minimum score. It never creates a signal and never bypasses execution guards.
 */
(() => {
  'use strict';
  const KEY='tygaScalpQualityV1';
  const defaults={enabled:true,minScore:0.6,atrMin:0.15,atrMax:3.5,trendPeriod:50,regimeLookback:20};
  const load=()=>({...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')});
  const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}};
  const ema=(v,p)=>{if(v.length<p)return NaN;let x=v.slice(0,p).reduce((a,b)=>a+b,0)/p,k=2/(p+1);for(let i=p;i<v.length;i++)x=v[i]*k+x*(1-k);return x};
  const atr=(c,p=14)=>{if(c.length<=p)return NaN;let s=0;for(let i=c.length-p;i<c.length;i++){const pc=i?c[i-1].close:c[i].close;s+=Math.max(c[i].high-c[i].low,Math.abs(c[i].high-pc),Math.abs(c[i].low-pc))}return s/p};
  function regime(c,o){const p=o.regimeLookback||20,a=atr(c,14);if(!Number.isFinite(a)||!c.length)return 'UNKNOWN';let hi=-Infinity,lo=Infinity;for(let i=Math.max(0,c.length-p);i<c.length;i++){hi=Math.max(hi,c[i].high);lo=Math.min(lo,c[i].low)}const range=hi-lo,vol=range/Math.max(a,1e-9);if(vol<2.5)return 'RANGE';if(vol>7)return 'HIGH_VOL';return 'TREND';}
  function htfBias(c,o){const p=o.trendPeriod||50;if(c.length<p+2)return 0;const closes=c.map(x=>x.close),e=ema(closes,p),last=closes[closes.length-1];return last>e?1:last<e?-1:0;}
  function quality(c,s,o){const cfg={...load(),...o};const r=regime(c.slice(0,s.i+1),cfg),bias=htfBias(c.slice(0,s.i+1),cfg),a=atr(c.slice(0,s.i+1),14);let score=Number(s.score)||0;
    if(bias && ((s.side==='BUY'?1:-1)===bias))score+=0.2; else if(bias)score-=0.25;
    if(r==='HIGH_VOL')score-=0.1;
    if(a>0){const base=(c[s.i].close||1);const rel=a/base*100;if(rel<cfg.atrMin||rel>cfg.atrMax)score-=0.25;}
    return {...s,qualityScore:Math.max(0,Math.min(1,score)),regime:r,htfBias:bias};
  }
  function journal(s){try{const a=JSON.parse(localStorage.getItem('tygaSignalJournal')||'[]');a.push({...s,time:Date.now()});localStorage.setItem('tygaSignalJournal',JSON.stringify(a.slice(-500)))}catch(_){} }
  function install(){const api=window.TygaScalper;if(!api||api.__qualityInstalled)return false;const original=api.strategies;api.strategies=function(c,o={}){const cfg={...load(),...o};const raw=original(c,o);if(cfg.enabled===false)return raw;const out=[];for(const s of raw){const q=quality(c,s,cfg);if(q.qualityScore>=cfg.minScore){out.push(q);journal(q)}}return out};api.quality={settings:()=>load(),configure(o={})=>{const s={...load(),...o};save(s);return s},regime,quality};api.__qualityInstalled=true;return true;}
  function metrics(){const api=window.TygaScalper;if(!api?.backtest||api.__metricsInstalled)return false;const original=api.backtest;api.backtest=function(c,o={}){const r=original(c,o),tr=r.trades||[];let peak=0,equity=0,maxDD=0,profit=0,loss=0;for(const t of tr){equity+=Number(t.r)||0;peak=Math.max(peak,equity);maxDD=Math.max(maxDD,peak-equity);if(t.r>0)profit+=t.r;else loss+=t.r}const avg=tr.length?equity/tr.length:0;return {...r,maxDrawdownR:maxDD,expectancyR:avg,grossProfitR:profit,grossLossR:Math.abs(loss),riskAdjustedR:maxDD?equity/maxDD:Infinity};};api.__metricsInstalled=true;return true;}
  function panel(){if(document.getElementById('tygaQualityPanel'))return;const b=document.createElement('button');b.id='tygaQualityPanel';b.textContent='⚙ Scalping Quality';Object.assign(b.style,{position:'fixed',right:'12px',bottom:'46px',zIndex:9999,padding:'9px 12px',borderRadius:'11px',border:'1px solid var(--line,#362C5C)',background:'var(--panel,#161331)',color:'var(--text,#F3F0FF)',font:'700 11px ui-monospace,monospace'});b.onclick=()=>{const s=load();const min=prompt('Minimum signal quality score (0–1):',String(s.minScore));if(min!==null){const n=Number(min);if(Number.isFinite(n)&&n>=0&&n<=1){s.minScore=n;save(s);alert(`Quality threshold set to ${n.toFixed(2)}.`)}}};document.body.appendChild(b)}
  const timer=setInterval(()=>{if(install()&&metrics()){clearInterval(timer);panel()}},100);setTimeout(()=>{clearInterval(timer);panel()},30000);
})();
