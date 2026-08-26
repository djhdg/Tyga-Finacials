/* Tyga Financials — shared signal/risk/execution guardrails. */
(() => {
  'use strict';
  const KEY='tygaRiskSettingsV1';
  const defaults={mode:'paper',maxStake:10,maxDailyLoss:25,maxConsecutiveLosses:3,maxTradesPerHour:10,cooldownSeconds:60};
  const state={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}'),dailyPnL:0,consecutiveLosses:0,trades:[]};
  const persist=()=>localStorage.setItem(KEY,JSON.stringify({...state,dailyPnL:state.dailyPnL,consecutiveLosses:state.consecutiveLosses,trades:state.trades.slice(-100)}));
  function prune(){const t=Date.now()-3600000;state.trades=state.trades.filter(x=>x.time>t)}
  window.TygaRisk={
    settings:()=>({...state}),
    configure(o={}){Object.assign(state,o);persist();return this.settings()},
    recordTrade({pnl=0}={}){prune();state.trades.push({time:Date.now(),pnl:Number(pnl)||0});state.dailyPnL+=Number(pnl)||0;state.consecutiveLosses=pnl<0?state.consecutiveLosses+1:0;persist()},
    resetDay(){state.dailyPnL=0;state.consecutiveLosses=0;state.trades=[];persist()},
    canTrade({stake=0,forceLive=false}={}){
      prune();
      if(forceLive && state.mode!=='live') return {ok:false,reason:'Live trading is disabled: switch to Live mode explicitly.'};
      if(Number(stake)>state.maxStake) return {ok:false,reason:`Stake exceeds max stake (${state.maxStake}).`};
      if(state.dailyPnL<=-Math.abs(state.maxDailyLoss)) return {ok:false,reason:'Daily loss limit reached.'};
      if(state.consecutiveLosses>=state.maxConsecutiveLosses) return {ok:false,reason:'Consecutive-loss limit reached.'};
      if(state.trades.length>=state.maxTradesPerHour) return {ok:false,reason:'Hourly trade limit reached.'};
      const last=state.trades[state.trades.length-1];
      if(last && Date.now()-last.time<state.cooldownSeconds*1000) return {ok:false,reason:`Cooldown active (${Math.ceil((state.cooldownSeconds*1000-(Date.now()-last.time))/1000)}s).`};
      return {ok:true};
    }
  };
})();
