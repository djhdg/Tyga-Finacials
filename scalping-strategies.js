/* Tyga Financials — multi-strategy scalping engine.
 * Strategies: liquidity sweep, VWAP reversion, EMA pullback, ATR breakout,
 * RSI divergence, Donchian breakout, Supertrend. Designed for 1m/5m use.
 * Backtest rules: closed candles only; entry at next candle open; if TP and SL
 * are both touched in one candle, SL is assumed first (conservative/no lookahead).
 */
(() => {
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const num=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
  function atr(c,p=14){const o=[];for(let i=0;i<c.length;i++){const pc=i?c[i-1].close:c[i].close;o[i]=Math.max(c[i].high-c[i].low,Math.abs(c[i].high-pc),Math.abs(c[i].low-pc));}const a=new Array(c.length).fill(NaN);if(c.length<p)return a;let s=0;for(let i=0;i<p;i++)s+=o[i];a[p-1]=s/p;for(let i=p;i<c.length;i++)a[i]=(a[i-1]*(p-1)+o[i])/p;return a;}
  function ema(v,p){const a=new Array(v.length).fill(NaN);if(v.length<p)return a;let s=0;for(let i=0;i<p;i++)s+=v[i];a[p-1]=s/p;const k=2/(p+1);for(let i=p;i<v.length;i++)a[i]=v[i]*k+a[i-1]*(1-k);return a;}
  function rsi(v,p=14){const a=new Array(v.length).fill(NaN);if(v.length<=p)return a;let g=0,l=0;for(let i=1;i<=p;i++){const d=v[i]-v[i-1];if(d>=0)g+=d;else l-=d;}let ag=g/p,al=l/p;a[p]=100-(100/(1+(al?ag/al:100)));for(let i=p+1;i<v.length;i++){const d=v[i]-v[i-1];ag=(ag*(p-1)+Math.max(d,0))/p;al=(al*(p-1)+Math.max(-d,0))/p;a[i]=100-(100/(1+(al?ag/al:100)));}return a;}
  function vwap(c){const a=new Array(c.length).fill(NaN);let pv=0,v=0;for(let i=0;i<c.length;i++){const vol=num(c[i].volume,1);pv+=((c[i].high+c[i].low+c[i].close)/3)*vol;v+=vol;a[i]=pv/v;}return a;}
  function supertrend(c,p=10,m=2){const A=atr(c,p), up=new Array(c.length).fill(NaN),dn=new Array(c.length).fill(NaN),st=new Array(c.length).fill(NaN),dir=new Array(c.length).fill(0);for(let i=0;i<c.length;i++){const mid=(c[i].high+c[i].low)/2;up[i]=mid+m*A[i];dn[i]=mid-m*A[i];if(i<p-1)continue;if(i===p-1){st[i]=dn[i];dir[i]=1;continue;}const fu=(up[i]<up[i-1]||c[i-1].close>up[i-1])?up[i]:up[i-1];const fd=(dn[i]>dn[i-1]||c[i-1].close<dn[i-1])?dn[i]:dn[i-1];up[i]=fu;dn[i]=fd;if(st[i-1]===up[i-1]){st[i]=c[i].close<=up[i]?up[i]:dn[i];dir[i]=c[i].close<=up[i]?-1:1;}else{st[i]=c[i].close>=dn[i]?dn[i]:up[i];dir[i]=c[i].close>=dn[i]?1:-1;}}return {st,dir};}
  function highest(c,i,n,key){let x=-Infinity;for(let j=Math.max(0,i-n);j<i;j++)x=Math.max(x,c[j][key]);return x;}
  function lowest(c,i,n,key){let x=Infinity;for(let j=Math.max(0,i-n);j<i;j++)x=Math.min(x,c[j][key]);return x;}
  function strategies(c,o={}){
    const n=c.length,A=atr(c,o.atrPeriod||14),E9=ema(c.map(x=>x.close),o.fast||9),E21=ema(c.map(x=>x.close),o.slow||21),R=rsi(c.map(x=>x.close),o.rsiPeriod||14),V=vwap(c),S=supertrend(c,o.stPeriod||10,o.stMult||2);const out=[];
    for(let i=25;i<n;i++){
      const x=c[i],p=c[i-1],a=A[i];if(!Number.isFinite(a)||a<=0)continue;const q={i,buy:[],sell:[]};
      const ph=highest(c,i,10,'high'),pl=lowest(c,i,10,'low');
      if(x.low<pl&&x.close>pl&&x.close>p.close)q.buy.push('LIQUIDITY_SWEEP');
      if(x.high>ph&&x.close<ph&&x.close<p.close)q.sell.push('LIQUIDITY_SWEEP');
      if(x.low<=V[i]-a*1.0&&x.close>V[i])q.buy.push('VWAP_REVERSION');
      if(x.high>=V[i]+a*1.0&&x.close<V[i])q.sell.push('VWAP_REVERSION');
      if(E9[i]>E21[i]&&p.close<=E9[i-1]&&x.close>E9[i]&&x.close>E21[i])q.buy.push('EMA_PULLBACK');
      if(E9[i]<E21[i]&&p.close>=E9[i-1]&&x.close<E9[i]&&x.close<E21[i])q.sell.push('EMA_PULLBACK');
      const range=Math.max(1,highest(c,i,8,'high')-lowest(c,i,8,'low'));
      if(x.close>highest(c,i,8,'high')&&range<=a*4)q.buy.push('ATR_BREAKOUT');
      if(x.close<lowest(c,i,8,'low')&&range<=a*4)q.sell.push('ATR_BREAKOUT');
      const divN=8, old=i-divN;
      if(R[i]<R[old]-4&&x.low<c[old].low&&x.close>p.close)q.buy.push('RSI_DIVERGENCE');
      if(R[i]>R[old]+4&&x.high>c[old].high&&x.close<p.close)q.sell.push('RSI_DIVERGENCE');
      if(x.close>highest(c,i,20,'high'))q.buy.push('DONCHIAN_BREAKOUT');
      if(x.close<lowest(c,i,20,'low'))q.sell.push('DONCHIAN_BREAKOUT');
      if(S.dir[i]===1&&S.dir[i-1]===-1)q.buy.push('SUPERTREND');
      if(S.dir[i]===-1&&S.dir[i-1]===1)q.sell.push('SUPERTREND');
      const min=Number(o.minConfirm||2), bs=q.buy.length,ss=q.sell.length;
      if(bs>=min&&bs>ss)out.push({i,side:'BUY',score:clamp(bs/5,0,1),reasons:q.buy,atr:a});
      else if(ss>=min&&ss>bs)out.push({i,side:'SELL',score:clamp(ss/5,0,1),reasons:q.sell,atr:a});
    }return out;
  }
  function backtest(c,o={}){
    const sig=strategies(c,o), rr=num(o.rr,1.2), slA=num(o.slAtr,0.8), maxBars=Math.max(1,Math.floor(num(o.maxBars,8))), trades=[];let wins=0,losses=0,pnlR=0;
    for(const s of sig){const ei=s.i+1;if(ei>=c.length||trades.some(t=>ei>t.entryIndex&&ei<=t.exitIndex))continue;const e=c[ei].open,sl=s.side==='BUY'?e-s.atr*slA:e+s.atr*slA,tp=s.side==='BUY'?e+s.atr*slA*rr:e-s.atr*slA*rr;let exit=e,outcome='OPEN',exitIndex=ei;
      for(let j=ei;j<Math.min(c.length,ei+maxBars);j++){const h=c[j].high,l=c[j].low;if(s.side==='BUY'){if(l<=sl){exit=sl;outcome='LOSS';exitIndex=j;break;}if(h>=tp){exit=tp;outcome='WIN';exitIndex=j;break;}}else{if(h>=sl){exit=sl;outcome='LOSS';exitIndex=j;break;}if(l<=tp){exit=tp;outcome='WIN';exitIndex=j;break;}}}
      if(outcome==='OPEN')continue;const r=s.side==='BUY'?(exit-e)/(e-sl):(e-exit)/(sl-e);pnlR+=r;if(outcome==='WIN')wins++;else losses++;trades.push({entryIndex:ei,exitIndex,side:s.side,entry:e,exit,stop:sl,target:tp,result:outcome,r,reasons:s.reasons});
    }
    const total=wins+losses;return {trades,wins,losses,total,winRate:total?wins/total:0,netR:pnlR,avgR:total?pnlR/total:0,profitFactor:losses?trades.filter(t=>t.r>0).reduce((a,t)=>a+t.r,0)/Math.abs(trades.filter(t=>t.r<0).reduce((a,t)=>a+t.r,0)):Infinity};
  }
  window.TygaScalper={strategies,backtest,version:'1.0.0',config:{timeframes:['1m','5m'],minConfirm:2,rr:1.2,slAtr:.8,maxBars:8}};
  function panel(){if(document.getElementById('tygaScalpLab'))return;const b=document.createElement('button');b.id='tygaScalpLab';b.textContent='⚡ Scalping Lab';Object.assign(b.style,{position:'fixed',right:'12px',bottom:'88px',zIndex:9999,padding:'10px 13px',borderRadius:'12px',border:'1px solid #EAC069',background:'#161331',color:'#F3F0FF',fontWeight:'700'});b.onclick=()=>{const c=Array.isArray(window.candles)?window.candles.slice(0,-1):[];if(c.length<80){alert('Need at least 80 completed candles for a meaningful scalping backtest.');return;}const r=backtest(c,{minConfirm:2,rr:1.2,slAtr:.8,maxBars:8});alert(`SCALPING BACKTEST\nTrades: ${r.total}\nWins: ${r.wins}\nLosses: ${r.losses}\nWin rate: ${(r.winRate*100).toFixed(1)}%\nNet R: ${r.netR.toFixed(2)}\nAvg R/trade: ${r.avgR.toFixed(2)}\nProfit factor: ${Number.isFinite(r.profitFactor)?r.profitFactor.toFixed(2):'∞'}`)};document.body.appendChild(b);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',panel,{once:true});else panel();
})();
