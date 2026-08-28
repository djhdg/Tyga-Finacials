/* Tyga Financials — execution-aware scalping quality.
 * Signal filtering only. Hard risk limits remain in the execution guard.
 */
(() => {
 'use strict';
 const K='tygaExecutionQualityV1';
 const D={atrPeriod:14,fast:9,slow:21,htfFast:20,htfSlow:50,minAtrPct:.00005,maxAtrPct:.025,slAtr:.8,tpAtr:1.2,maxSpreadAtr:.20,scoreMin:.60};
 let cfg={...D}; try{cfg={...cfg,...JSON.parse(localStorage.getItem(K)||'{}')}}catch(_){ }
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(cfg))}catch(_){}};
 const ema=(v,p)=>{const a=Array(v.length).fill(NaN);if(v.length<p)return a;let s=0;for(let i=0;i<p;i++)s+=v[i];a[p-1]=s/p;const k=2/(p+1);for(let i=p;i<v.length;i++)a[i]=v[i]*k+a[i-1]*(1-k);return a};
 const atr=(c,p)=>{const tr=c.map((x,i)=>{const pc=i?c[i-1].close:x.close;return Math.max(x.high-x.low,Math.abs(x.high-pc),Math.abs(x.low-pc))});const a=Array(c.length).fill(NaN);if(c.length<p)return a;let s=0;for(let i=0;i<p;i++)s+=tr[i];a[p-1]=s/p;for(let i=p;i<c.length;i++)a[i]=(a[i-1]*(p-1)+tr[i])/p;return a};
 function regime(c,i){const A=atr(c,cfg.atrPeriod),f=ema(c.map(x=>x.close),cfg.fast),s=ema(c.map(x=>x.close),cfg.slow);if(i<cfg.slow||!Number.isFinite(A[i]))return 'UNKNOWN';const strength=Math.abs(f[i]-s[i])/A[i],vol=A[i]/Math.max(Math.abs(c[i].close),1);if(vol>cfg.maxAtrPct)return 'HIGH_VOL';if(strength>.8)return f[i]>s[i]?'UPTREND':'DOWNTREND';return 'RANGE';}
 function evaluate(c,i,side,spread=0){if(!Array.isArray(c)||i<cfg.slow)return {ok:false,reason:'insufficient history'};const A=atr(c,cfg.atrPeriod),f=ema(c.map(x=>x.close),cfg.fast),s=ema(c.map(x=>x.close),cfg.slow),a=A[i],x=c[i],atrPct=a/Math.max(Math.abs(x.close),1),bias=f[i]>s[i]?'BUY':f[i]<s[i]?'SELL':'NEUTRAL',rg=regime(c,i);if(atrPct<cfg.minAtrPct)return {ok:false,reason:'low volatility',regime:rg};if(atrPct>cfg.maxAtrPct)return {ok:false,reason:'excessive volatility',regime:rg};if(spread>cfg.maxSpreadAtr*a)return {ok:false,reason:'spread too wide',regime:rg};let score=.25;if(side===bias)score+=.35;if((side==='BUY'&&x.close>=f[i])||(side==='SELL'&&x.close<=f[i]))score+=.20;if(rg!=='HIGH_VOL')score+=.20;return {ok:score>=cfg.scoreMin,score,regime:rg,bias,atr:a,stopDistance:a*cfg.slAtr,targetDistance:a*cfg.tpAtr,reason:score>=cfg.scoreMin?'qualified':'quality threshold'};}
 function configure(o={}){cfg={...cfg,...o};save();return {...cfg}};
 function levels(price,side,a){return {stop:side==='BUY'?price-a*cfg.slAtr:price+a*cfg.slAtr,target:side==='BUY'?price+a*cfg.tpAtr:price-a*cfg.tpAtr}};
 window.TygaExecutionQuality={config:()=>({...cfg}),configure,evaluate,levels,regime,version:'1.0.0'};
})();
