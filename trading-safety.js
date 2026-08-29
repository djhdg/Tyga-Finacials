/* Tyga Financials — shared signal/risk/execution guardrails. */
(() => {
  'use strict';
  const KEY='tygaRiskSettingsV1';
  // Paper/demo permits up to $60. Live remains capped at $10.
  const defaults={mode:'paper',paperMaxStake:60,liveMaxStake:10,maxDailyLoss:25,maxConsecutiveLosses:3,maxTradesPerHour:10,cooldownSeconds:60};
  const stored=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}})();
  const state={...defaults,...stored,dailyPnL:0,consecutiveLosses:0,trades:[]};
  if(stored.maxStake!=null){if(stored.mode==='live')state.liveMaxStake=10;else state.paperMaxStake=60;delete state.maxStake;}
  const persist=()=>localStorage.setItem(KEY,JSON.stringify({...state,dailyPnL:state.dailyPnL,consecutiveLosses:state.consecutiveLosses,trades:state.trades.slice(-100)}));
  function prune(){const t=Date.now()-3600000;state.trades=state.trades.filter(x=>x.time>t)}
  window.TygaRisk={
    settings:()=>({...state,maxStake:state.mode==='live'?state.liveMaxStake:state.paperMaxStake}),
    configure(o={}){const next={...o};delete next.maxStake;Object.assign(state,next);persist();return this.settings()},
    recordTrade({pnl=0}={}){prune();state.trades.push({time:Date.now(),pnl:Number(pnl)||0});state.dailyPnL+=Number(pnl)||0;state.consecutiveLosses=pnl<0?state.consecutiveLosses+1:0;persist()},
    resetDay(){state.dailyPnL=0;state.consecutiveLosses=0;state.trades=[];persist()},
    canTrade({stake=0,forceLive=false}={}){
      prune();
      if(forceLive && state.mode!=='live')return{ok:false,reason:'Live trading is disabled: switch to Live mode explicitly.'};
      const limit=state.mode==='live'?state.liveMaxStake:state.paperMaxStake;
      if(Number(stake)>limit)return{ok:false,reason:`Stake exceeds ${state.mode==='live'?'live':'paper'} max stake (${limit}).`};
      if(state.dailyPnL<=-Math.abs(state.maxDailyLoss))return{ok:false,reason:'Daily loss limit reached.'};
      if(state.consecutiveLosses>=state.maxConsecutiveLosses)return{ok:false,reason:'Consecutive-loss limit reached.'};
      if(state.trades.length>=state.maxTradesPerHour)return{ok:false,reason:'Hourly trade limit reached.'};
      const last=state.trades[state.trades.length-1];
      if(last&&Date.now()-last.time<state.cooldownSeconds*1000)return{ok:false,reason:`Cooldown active (${Math.ceil((state.cooldownSeconds*1000-(Date.now()-last.time))/1000)}s).`};
      return{ok:true};
    }
  };
  persist();
})();
