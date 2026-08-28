/* Tyga Financials — signal integrity guard v2.
 * Signal calculations use completed candles only. A direction must persist across
 * two consecutive completed candles before a position can be opened.
 */
(() => {
  'use strict';
  const state = new Map();
  let installed = false;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function install(){
    if(installed || typeof window.renderInner !== 'function') return false;
    installed = true;
    const originalRender = window.renderInner;
    const originalChart = window.drawChart;
    let liveCandles = [];

    if(typeof originalChart === 'function'){
      window.drawChart = function(cands, info){
        const live = liveCandles;
        if(live.length && Array.isArray(cands) && cands.length){
          const liveLast = live[live.length-1];
          const analysisLast = cands[cands.length-1];
          if(liveLast && (!analysisLast || analysisLast.epoch !== liveLast.epoch)){
            return originalChart.call(this, cands.concat(liveLast), info);
          }
        }
        return originalChart.apply(this, arguments);
      };
    }

    window.renderInner = function(){
      const live = Array.isArray(window.candles) ? window.candles.slice() : [];
      liveCandles = live;
      if(live.length < 3) return originalRender.apply(this, arguments);

      const closed = live.slice(0,-1);
      const sym = window.currentSymbol || 'unknown';
      const epoch = Number(closed[closed.length-1]?.epoch || 0);
      const hadPosition = !!(window.openPositions?.[sym]?.status === 'open');
      const previous = state.get(sym);
      const sameConfirmedCandle = !hadPosition && previous?.epoch === epoch && previous?.confirmed === true;
      const firstPass = !hadPosition && !sameConfirmedCandle;

      // The live OHLC candle changes on every tick. Signal math and entry levels must not.
      window.candles = closed;

      const oldExecute = window.executeAutoTrade;
      const oldLog = window.logVerdict;
      if(!hadPosition && (firstPass || sameConfirmedCandle)){
        window.executeAutoTrade = function(){};
        window.logVerdict = function(){};
      }

      try { originalRender.apply(this, arguments); }
      finally {
        window.candles = live;
        window.executeAutoTrade = oldExecute;
        window.logVerdict = oldLog;
      }

      const created = !!(window.openPositions?.[sym]?.status === 'open');
      const createdPos = window.openPositions?.[sym];
      const text = document.getElementById('callText')?.textContent || '';
      const call = /\bBUY\b/.test(text) ? 'BUY' : /\bSELL\b/.test(text) ? 'SELL' : null;

      if(!hadPosition && sameConfirmedCandle){
        // A confirmed signal has already been evaluated on this candle. Never re-enter it.
        if(created && createdPos){
          delete window.openPositions[sym];
          try{ window.savePositions?.(); }catch(_){}
        }
        const callEl = document.getElementById('callText');
        const confEl = document.getElementById('confText');
        if(callEl){ callEl.textContent='WAIT — SIGNAL USED'; callEl.className='call WAIT'; }
        if(confEl) confEl.textContent='Signal already evaluated on this completed candle';
        document.getElementById('levels')?.replaceChildren();
        try{ window.drawChart?.(live,{call:'WAIT',entry:null,sl:null,tps:null,overlay:null}); }catch(_){}
        return;
      }

      if(!hadPosition && firstPass && call){
        if(previous && previous.epoch !== epoch && previous.call === call && !previous.confirmed){
          // Two consecutive completed candles agree. Remove the suppressed first-pass position,
          // then run the original renderer once normally so logging and auto-execution work.
          state.set(sym,{epoch,call,confirmed:true});
          if(created && createdPos){
            delete window.openPositions[sym];
            try{ window.savePositions?.(); }catch(_){}
          }
          window.candles = closed;
          try{ originalRender.apply(this, arguments); }
          finally{ window.candles = live; }
          return;
        }

        state.set(sym,{epoch,call,confirmed:false});
        if(created && createdPos){
          delete window.openPositions[sym];
          try{ window.savePositions?.(); }catch(_){}
        }
        const callEl = document.getElementById('callText');
        const confEl = document.getElementById('confText');
        if(callEl){ callEl.textContent=`${call} — CONFIRMING`; callEl.className='call '+call; }
        if(confEl) confEl.textContent='Waiting for a second consecutive closed candle confirmation';
        document.getElementById('levels')?.replaceChildren();
        try{ window.drawChart?.(live,{call:'WAIT',entry:null,sl:null,tps:null,overlay:null}); }catch(_){}
        return;
      }

      if(!hadPosition && !created && !call) state.delete(sym);

      // Keep the quote live even though the signal engine is deliberately one candle behind.
      const last = live[live.length-1], prev = live[live.length-2];
      if(last && typeof window.formatPrice === 'function'){
        const p = document.getElementById('price');
        if(p) p.textContent = window.formatPrice(last.close,sym);
        const d = document.getElementById('priceDelta');
        if(d && prev?.close){
          const pct=((last.close-prev.close)/prev.close)*100;
          d.textContent=(pct>=0?'+':'')+pct.toFixed(3)+'%';
          d.className='price-delta '+(pct>=0?'up':'down');
        }
      }
    };
    return true;
  }

  (async()=>{
    for(let i=0;i<300;i++){
      if(install()) return;
      await wait(100);
    }
  })();
})();
