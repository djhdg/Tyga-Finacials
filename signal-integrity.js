/* Tyga Financials — signal integrity guard.
 * Prevents repainting/forming-candle signals and requires two closed-candle confirmations.
 */
(() => {
  'use strict';
  const STATE = new Map();
  let installed = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function install() {
    if (installed || typeof window.renderInner !== 'function') return false;
    installed = true;

    const originalRenderInner = window.renderInner;
    const originalDrawChart = window.drawChart;
    let liveCandles = null;

    // Keep the chart visually live while the signal engine only sees completed candles.
    if (typeof originalDrawChart === 'function') {
      window.drawChart = function(cands, info) {
        const live = liveCandles;
        if (live && Array.isArray(live) && live.length && Array.isArray(cands) && cands.length) {
          const last = live[live.length - 1];
          const lastAnalysis = cands[cands.length - 1];
          if (!lastAnalysis || lastAnalysis.epoch !== last.epoch) {
            return originalDrawChart.call(this, cands.concat([last]), info);
          }
        }
        return originalDrawChart.apply(this, arguments);
      };
    }

    window.renderInner = function() {
      const live = Array.isArray(window.candles) ? window.candles.slice() : [];
      liveCandles = live;
      if (live.length < 3) return originalRenderInner.apply(this, arguments);

      // Deriv's OHLC subscription updates the currently forming candle on every tick.
      // Never feed that candle into signal calculations.
      const closed = live.slice(0, -1);
      const sym = window.currentSymbol || 'unknown';
      const epoch = Number(closed[closed.length - 1]?.epoch || 0);
      const hadPosition = !!(window.openPositions && window.openPositions[sym] && window.openPositions[sym].status === 'open');
      const prev = STATE.get(sym);

      // First occurrence of a direction is only a candidate. A second consecutive
      // completed candle in the same direction is required before opening a position.
      const firstCandidate = !hadPosition && (!prev || prev.epoch !== epoch || !prev.confirmed);
      const sameConfirmedCandle = !hadPosition && prev && prev.epoch === epoch && prev.confirmed;
      const candidateBlock = firstCandidate || sameConfirmedCandle;

      window.candles = closed;
      const oldExecute = window.executeAutoTrade;
      const oldLogVerdict = window.logVerdict;
      if (candidateBlock) {
        // Never allow the first/unrepeatable candle to place a real or demo order.
        window.executeAutoTrade = function() {};
        window.logVerdict = function() {};
      }

      try {
        originalRenderInner.apply(this, arguments);
      } finally {
        window.candles = live;
        window.executeAutoTrade = oldExecute;
        window.logVerdict = oldLogVerdict;
      }

      const created = !!(window.openPositions && window.openPositions[sym] && window.openPositions[sym].status === 'open');
      const pos = window.openPositions?.[sym];
      const renderedCall = document.getElementById('callText')?.textContent || '';
      const call = /\bBUY\b/.test(renderedCall) ? 'BUY' : /\bSELL\b/.test(renderedCall) ? 'SELL' : null;

      if (!hadPosition && candidateBlock) {
        if (sameConfirmedCandle) {
          // Position may have closed during the same candle; never reopen on that candle.
          if (created && window.openPositions?.[sym] === pos) {
            delete window.openPositions[sym];
            try { if (typeof window.savePositions === 'function') window.savePositions(); } catch (_) {}
          }
          const callEl = document.getElementById('callText');
          const confEl = document.getElementById('confText');
          if (callEl) { callEl.textContent = 'WAIT — SIGNAL USED'; callEl.className = 'call WAIT'; }
          if (confEl) confEl.textContent = 'Signal already evaluated on this completed candle';
          const levels = document.getElementById('levels');
          if (levels) levels.innerHTML = '';
          return;
        }

        if (call) {
          if (prev && prev.epoch !== epoch && prev.call === call && !prev.confirmed) {
            // Same direction on two consecutive completed candles: confirmed.
            STATE.set(sym, {epoch, call, confirmed:true});
            window.candles = closed;
            try { originalRenderInner.apply(this, arguments); }
            finally { window.candles = live; }
            return;
          }

          STATE.set(sym, {epoch, call, confirmed:false});

          // Remove the first-candle position created by the original renderer.
          if (created && window.openPositions?.[sym] === pos) {
            delete window.openPositions[sym];
            try { if (typeof window.savePositions === 'function') window.savePositions(); } catch (_) {}
          }

          const callEl = document.getElementById('callText');
          const confEl = document.getElementById('confText');
          if (callEl) { callEl.textContent = `${call} — CONFIRMING`; callEl.className = 'call ' + call; }
          if (confEl) confEl.textContent = 'Waiting for a second consecutive closed candle confirmation';
          const levels = document.getElementById('levels');
          if (levels) levels.innerHTML = '';
          if (typeof window.drawChart === 'function') {
            try { window.drawChart(live, {call:'WAIT', entry:null, sl:null, tps:null, overlay:null}); } catch (_) {}
          }
          return;
        }

        STATE.delete(sym);
      } else if (!hadPosition && !created && !call) {
        STATE.delete(sym);
      }

      // Restore the live quote after closed-candle analysis.
      const liveLast = live[live.length - 1];
      const prevLive = live[live.length - 2];
      if (liveLast && typeof window.formatPrice === 'function') {
        const priceEl = document.getElementById('price');
        if (priceEl) priceEl.textContent = window.formatPrice(liveLast.close, sym);
        const deltaEl = document.getElementById('priceDelta');
        if (deltaEl && prevLive && prevLive.close) {
          const pct = ((liveLast.close - prevLive.close) / prevLive.close) * 100;
          deltaEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(3) + '%';
          deltaEl.className = 'price-delta ' + (pct >= 0 ? 'up' : 'down');
        }
      }
    };
    return true;
  }

  (async function boot() {
    for (let i = 0; i < 300; i++) {
      if (install()) return;
      await sleep(100);
    }
  })();
})();
