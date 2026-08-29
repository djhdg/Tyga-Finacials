/* Tyga Financials — shared signal/risk/execution guardrails. */
(() => {
  'use strict';
  const KEY='tygaRiskSettingsV1';
  // Paper/demo permits a stake up to 60% of the current account balance. Live remains capped at $10.
  const defaults={mode:'paper',paperMaxBalancePct:0.60,liveMaxStake:10,maxDailyLoss:25,maxConsecutiveLosses:3,maxTradesPerHour:10,cooldownSeconds:60};
  const stored=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}})();
  const state={...defaults,...stored,dailyPnL:0,consecutiveLosses:0,trades:[]};
  delete state.paperMaxStake;
  delete state.maxStake;
  state.paperMaxBalancePct=0.60;
  state.liveMaxStake=10;
  const persist=()=>localStorage.setItem(KEY,JSON.stringify({...state,dailyPnL:state.dailyPnL,consecutiveLosses:state.consecutiveLosses,trades:state.trades.slice(-100)}));
  function prune(){const t=Date.now()-3600000;state.trades=state.trades.filter(x=>x.time>t)}
  window.TygaRisk={
    settings:()=>({...state,maxStake:state.mode==='live'?state.liveMaxStake:null,paperMaxBalancePct:state.paperMaxBalancePct}),
    configure(o={}){const next={...o};delete next.maxStake;delete next.paperMaxStake;delete next.paperMaxBalancePct;Object.assign(state,next);state.paperMaxBalancePct=0.60;state.liveMaxStake=10;persist();return this.settings()},
    recordTrade({pnl=0}={}){prune();state.trades.push({time:Date.now(),pnl:Number(pnl)||0});state.dailyPnL+=Number(pnl)||0;state.consecutiveLosses=pnl<0?state.consecutiveLosses+1:0;persist()},
    resetDay(){state.dailyPnL=0;state.consecutiveLosses=0;state.trades=[];persist()},
    canTrade({stake=0,balance=null,forceLive=false}={}){
      prune();
      if(forceLive && state.mode!=='live')return{ok:false,reason:'Live trading is disabled: switch to Live mode explicitly.'};
      let limit;
      if(state.mode==='live') limit=state.liveMaxStake;
      else {
        const b=Number(balance);
        if(!Number.isFinite(b)||b<=0)return{ok:false,reason:'Demo account balance is required to calculate the 60% stake limit.'};
        limit=b*state.paperMaxBalancePct;
      }
      if(Number(stake)>limit)return{ok:false,reason:`Stake exceeds ${state.mode==='live'?'live max stake ($10)':'demo max stake (60% of balance = '+limit.toFixed(2)+')'}.`};
      if(state.dailyPnL<=-Math.abs(state.maxDailyLoss))return{ok:false,reason:'Daily loss limit reached.'};
      if(state.consecutiveLosses>=state.maxConsecutiveLosses)return{ok:false,reason:'Consecutive-loss limit reached.'};
      if(state.trades.length>=state.maxTradesPerHour)return{ok:false,reason:'Hourly trade limit reached.'};
      const last=state.trades[state.trades.length-1];
      if(last&&Date.now()-last.time<state.cooldownSeconds*1000)return{ok:false,reason:`Cooldown active (${Math.ceil((state.cooldownSeconds*1000-(Date.now()-last.time))/1000)}s).`};
      return{ok:true,limit};
    }
  };
  persist();
})();
