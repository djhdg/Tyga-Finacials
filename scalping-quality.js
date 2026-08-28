/* Tyga Financials — scalping quality layer.
 * Deterministic, closed-candle filters for 1m/5m scalping.
 * Does not execute trades; it only ranks/rejects signals.
 */
(() => {
  'use strict';
  const KEY='tygaScalpQualityV1';
  const defaults={minScore:0.60,minConfirm:2,atrPeriod:14,fastEma:9,slowEma:21,lookback:20,maxAtrPct:0.025,minAtrPct:0.00005,cooldownBars:2};
  let cfg={...defaults};
  try{cfg={...cfg,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){ }
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}};
  const finite=x=>Number.isFinite(Number(x));
  function atr(c,p){const tr=[];for(let i=0;i<c.length;i++){const pc=i?c[i-1].close:c[i].close;tr[i]=Math.max(c[i].high-c[i].low,Math.abs(c[i].high-pc),Math.abs(c[i].low-pc));}const a=Array(c.length).fill(NaN);if(c.length<p)return a;let s=0;for(let i=0;i<p;i++)s+=tr[i];a[p-1]=s/p;for(let i=p;i<c.length;i++)a[i]=(a[i-1]*(p-1)+tr[i])/p;return a;}
  function ema(v,p){const a=Array(v.length).fill(NaN);if(v.length<p)return a;let s=0;for(let i=0;i<p;i++)s+=v[i];a[p-1]=s/p;const k=2/(p+1);for(let i=p;i<v.length;i++)a[i]=v[i]*k+a[i-1]*(1-k);return a;}
  function assess(c,i){if(!Array.isArray(c)||i<Math.max(cfg.slowEma,cfg.atrPeriod,cfg.lookback))return {ok:false,score:0,reason:'insufficient history'};const a=atr(c,cfg.atrPeriod),e9=ema(c.map(x=>x.close),cfg.fastEma),e21=ema(c.map(x=>x.close),cfg.slowEma),x=c[i];if(!finite(a[i])||!finite(e9[i])||!finite(e21[i]))return {ok:false,score:0,reason:'indicators unavailable'};const atrPct=a[i]/Math.max(Math.abs(x.close),1);if(atrPct<cfg.minAtrPct)return {ok:false,score:0,reason:'low volatility'};if(atrPct>cfg.maxAtrPct)return {ok:false,score:0,reason:'excessive volatility'};const range=Math.max(1,...c.slice(Math.max(0,i-cfg.lookback),i).map(z=>z.high))-Math.min(...c.slice(Math.max(0,i-cfg.lookback),i).map(z=>z.low));const trend=Math.abs(e9[i]-e21[i])/Math.max(a[i],1e-9);const score=Math.min(1,(trend>=0.5?0.25:0)+(atrPct>=cfg.minAtrPct&&atrPct<=cfg.maxAtrPct?0.25:0)+(x.close>=e9[i]?0.25:0)+(range>0?0.25:0));return {ok:score>=cfg.minScore,score,atrPct,trend,reason:score>=cfg.minScore?'qualified':'quality threshold not met'};}
  function configure(o={}){cfg={...cfg,...o};save();return {...cfg};}
  function journal(entry){try{const k='tygaSignalJournalV1',a=JSON.parse(localStorage.getItem(k)||'[]');a.push({...entry,time:Date.now()});localStorage.setItem(k,JSON.stringify(a.slice(-500)));}catch(_){}}
  window.TygaQuality={config:()=>({...cfg}),configure,assess,journal,version:'1.0.0'};
})();
