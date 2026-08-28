/* Tyga Financials — scalping analytics: walk-forward + Monte Carlo. */
(() => {
  'use strict';
  function equity(trades){let e=0,peak=0,maxDD=0;for(const t of trades){e+=Number(t.r)||0;peak=Math.max(peak,e);maxDD=Math.max(maxDD,peak-e);}return {netR:e,maxDrawdownR:maxDD};}
  function walkForward(c,engine,opt={}){const train=Math.max(80,opt.train||240),test=Math.max(20,opt.test||80),step=Math.max(1,opt.step||test),rows=[];for(let s=0;s+train+test<=c.length;s+=step){const tr=engine(c.slice(s,s+train),opt),te=engine(c.slice(s+train,s+train+test),opt);const m=equity(te.trades||[]);rows.push({start:s,trainTrades:tr.total||0,testTrades:te.total||0,testWinRate:te.winRate||0,testNetR:m.netR,testDrawdownR:m.maxDrawdownR});}return rows;}
  function monteCarlo(trades,runs=1000){const base=trades.map(t=>Number(t.r)||0),out=[];for(let k=0;k<runs;k++){let a=base.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}out.push(equity(a));}out.sort((a,b)=>a.netR-b.netR);const q=p=>out[Math.min(out.length-1,Math.floor(p*(out.length-1)))];return {runs,medianNetR:q(.5).netR,worstNetR:q(0).netR,p10NetR:q(.1).netR,p90NetR:q(.9).netR,worstDrawdownR:Math.max(...out.map(x=>x.maxDrawdownR))};}
  function leaderboard(c,engine,configs){return configs.map(x=>{const r=engine(c,x);const e=equity(r.trades||[]);return {...x,trades:r.total||0,winRate:r.winRate||0,netR:e.netR,avgR:r.avgR||0,profitFactor:r.profitFactor||0,maxDrawdownR:e.maxDrawdownR,expectancy:r.avgR||0};}).sort((a,b)=>b.netR-b.maxDrawdownR-(a.netR-a.maxDrawdownR));}
  window.TygaAnalytics={walkForward,monteCarlo,leaderboard,equity,version:'1.0.0'};
})();
