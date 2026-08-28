/* Tyga Financials — robustness guard for scalping results. */
(() => {
 'use strict';
 const KEY='tygaScalpRobustnessV1';
 const D={minTrades:30,maxDrawdownR:12,minExpectancyR:0.02,minProfitFactor:1.05,maxSpreadAtr:0.20};
 let cfg={...D}; try{cfg={...cfg,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){ }
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}};
 function evaluate(r={}){const trades=Number(r.total??r.trades??0),dd=Math.abs(Number(r.maxDrawdownR??0)),ex=Number(r.expectancy??r.avgR??0),pf=Number(r.profitFactor??0);const reasons=[];if(trades<cfg.minTrades)reasons.push('insufficient sample');if(dd>cfg.maxDrawdownR)reasons.push('drawdown too high');if(ex<cfg.minExpectancyR)reasons.push('expectancy too low');if(pf<cfg.minProfitFactor)reasons.push('profit factor too low');return {eligible:reasons.length===0,reasons,trades,maxDrawdownR:dd,expectancy:ex,profitFactor:pf};}
 function configure(o={}){cfg={...cfg,...o};save();return {...cfg}};
 window.TygaRobustness={config:()=>({...cfg}),configure,evaluate,version:'1.0.0'};
})();
