/* Tyga Financials — execution controls.
 * Safe default: automated execution is OFF. Turning it ON never bypasses the
 * existing trading-safety/execution-guard checks; it only arms auto execution.
 */
(() => {
  'use strict';
  const KEY = 'tyga:auto-execution';
  let installed = false;
  let original = null;

  const getEnabled = () => localStorage.getItem(KEY) === 'on';
  const setEnabled = v => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (_) {} };

  function paint(btn) {
    if (!btn) return;
    const on = getEnabled();
    btn.textContent = on ? 'AUTO EXECUTION: ON' : 'AUTO EXECUTION: OFF';
    btn.setAttribute('aria-pressed', String(on));
    btn.style.borderColor = on ? 'var(--buy,#2FE6A6)' : 'var(--line,#362C5C)';
    btn.style.color = on ? 'var(--buy,#2FE6A6)' : 'var(--muted,#8D84B8)';
  }

  function install() {
    if (installed || typeof window.executeAutoTrade !== 'function') return false;
    installed = true;
    original = window.executeAutoTrade;

    window.executeAutoTrade = function(...args) {
      if (!getEnabled()) {
        try { window.logVerdict?.('AUTO EXECUTION OFF — signal only'); } catch (_) {}
        return false;
      }
      // Never bypass the app's existing risk/execution guard.
      return original.apply(this, args);
    };

    const btn = document.createElement('button');
    btn.id = 'tygaExecutionToggle';
    btn.type = 'button';
    Object.assign(btn.style, {
      position:'fixed', right:'12px', bottom:'132px', zIndex:10000,
      padding:'9px 12px', borderRadius:'11px', border:'1px solid var(--line,#362C5C)',
      background:'var(--panel,#161331)', color:'var(--muted,#8D84B8)',
      font:'700 11px ui-monospace,monospace', letterSpacing:'.2px'
    });
    btn.title = 'Controls automated execution. Existing safety/risk checks remain active.';
    btn.onclick = () => {
      const next = !getEnabled();
      if (next && !confirm('Enable automated trading? Existing safety limits remain active, but trades may be sent to the connected Deriv account.')) return;
      setEnabled(next);
      paint(btn);
      try { window.updateDailyStatus?.(); } catch (_) {}
    };
    document.body.appendChild(btn);
    paint(btn);
    return true;
  }

  const timer = setInterval(() => { if (install()) clearInterval(timer); }, 100);
  setTimeout(() => clearInterval(timer), 30000);
})();
