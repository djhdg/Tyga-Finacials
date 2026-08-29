/* Tyga Financials — normalize legacy direct buys into the documented proposal -> buy flow. */
(() => {
  'use strict';
  const pending = new Map();
  let seq = 7000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function normalizeParameters(input) {
    const p = { ...(input || {}) };
    if (p.symbol && !p.underlying_symbol) p.underlying_symbol = p.symbol;
    delete p.symbol;
    delete p.loginid;
    delete p.subscribe;
    // New proposal API requires a duration or expiry. Preserve an existing duration;
    // otherwise use one tick, which is appropriate for the existing scalping/digit path.
    if (p.duration == null && p.date_expiry == null) {
      p.duration = 1;
      p.duration_unit = 't';
    }
    if (!p.duration_unit && p.duration != null) p.duration_unit = 't';
    // Client-side SL/TP is already maintained by Tyga. Do not send the old stake-based
    // limit_order values through the proposal request because they are not entry stakes.
    delete p.limit_order;
    return p;
  }

  function patch(ws) {
    if (!ws || ws.__tygaProposalFlow) return;
    const originalSend = ws.send.bind(ws);
    ws.__tygaProposalFlow = true;
    ws.send = function(payload) {
      let msg;
      try { msg = typeof payload === 'string' ? JSON.parse(payload) : payload; } catch (_) { return originalSend(payload); }
      if (!msg || String(msg.buy) !== '1' || !msg.parameters) return originalSend(payload);

      const p = normalizeParameters(msg.parameters);
      if (!p.contract_type || !p.currency || !p.underlying_symbol) {
        return originalSend(payload);
      }
      const reqId = ++seq;
      const proposalReq = {
        proposal: 1,
        amount: Number(p.amount),
        basis: p.basis || 'stake',
        contract_type: p.contract_type,
        currency: p.currency,
        underlying_symbol: p.underlying_symbol,
        duration: Number(p.duration),
        duration_unit: p.duration_unit,
        req_id: reqId
      };
      for (const key of ['barrier','barrier2','date_expiry','multiplier','selected_tick','growth_rate','cancellation','payout_per_point','passthrough']) {
        if (p[key] != null) proposalReq[key] = p[key];
      }
      pending.set(reqId, { originalPrice: Number(msg.price), context: window.lastTradeContext || null, created: Date.now() });
      try { originalSend(JSON.stringify(proposalReq)); }
      catch (e) { pending.delete(reqId); throw e; }
      return;
    };

    ws.addEventListener('message', event => {
      let data; try { data = JSON.parse(event.data); } catch (_) { return; }
      const reqId = Number(data?.req_id);
      const ctx = pending.get(reqId);
      if (!ctx) return;
      pending.delete(reqId);
      if (data.error) {
        try { window.logExecutionResult?.(false, data.error.message || 'Deriv proposal rejected'); } catch (_) {}
        return;
      }
      const proposal = data.proposal;
      const proposalId = proposal?.id;
      const ask = Number(proposal?.ask_price);
      if (!proposalId || !Number.isFinite(ask) || ask <= 0) {
        try { window.logExecutionResult?.(false, 'Deriv returned an invalid proposal'); } catch (_) {}
        return;
      }
      // Buy at the current proposal ask price, capped by the original requested stake.
      const maxPrice = Number.isFinite(ctx.originalPrice) && ctx.originalPrice > 0 ? ctx.originalPrice : ask;
      originalSend(JSON.stringify({ buy: String(proposalId), price: Math.min(ask, maxPrice), req_id: ++seq }));
    });
  }

  async function install() {
    for (let i = 0; i < 120; i++) {
      const ws = window.tradingWs;
      if (ws && ws.readyState !== WebSocket.CLOSED) patch(ws);
      await sleep(250);
    }
  }
  install();
})();
