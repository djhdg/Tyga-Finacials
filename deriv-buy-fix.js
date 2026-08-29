/* Tyga Financials — Deriv New API buy-parameter compatibility fix. */
(() => {
  'use strict';
  if (WebSocket.prototype.__tygaBuyParamFix) return;
  const originalSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function(data) {
    try {
      const req = typeof data === 'string' ? JSON.parse(data) : null;
      if (req && String(req.buy) === '1' && req.parameters && typeof req.parameters === 'object') {
        const p = { ...req.parameters };
        // Deriv's current Options API renamed the contract symbol field.
        if (p.symbol && !p.underlying_symbol) {
          p.underlying_symbol = p.symbol;
          delete p.symbol;
        }
        // The authenticated account already determines the currency/account context.
        // Keep only a valid numeric maximum purchase price at the buy level.
        const fixed = { ...req, parameters: p };
        return originalSend.call(this, JSON.stringify(fixed));
      }
    } catch (_) {
      // Preserve normal WebSocket behavior for non-JSON or unrelated messages.
    }
    return originalSend.call(this, data);
  };
  WebSocket.prototype.__tygaBuyParamFix = true;
})();
