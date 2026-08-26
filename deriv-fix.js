/* Tyga Financials — Deriv 2026 authentication fix
 * Uses the current Deriv REST + OTP WebSocket flow.
 * No credentials are sent anywhere except directly to api.derivws.com.
 */
(() => {
  'use strict';
  const API = 'https://api.derivws.com/trading/v1/options';
  let fixBound = false;
  let reconnectTimer = null;
  let manualDisconnect = false;

  const $ = id => document.getElementById(id);
  const status = msg => { const el = $('dtStatus'); if (el) el.textContent = msg; };
  const read = id => ($(id)?.value || '').trim();
  const save = async () => {
    if (typeof storeSet === 'function' && typeof session !== 'undefined' && session?.u) {
      await storeSet('autoexec:' + session.u, derivExec, false);
    }
  };

  function friendlyError(statusCode, body) {
    let msg = '';
    try { const j = typeof body === 'string' ? JSON.parse(body) : body; msg = j?.errors?.[0]?.message || j?.error?.message || j?.message || ''; } catch (_) {}
    if (statusCode === 401) return 'Deriv rejected the token (401). Use a new PAT token from developers.deriv.com with the trade scope.';
    if (statusCode === 403) return 'Deriv denied access (403). Your token needs the trade permission and must belong to this app.';
    if (statusCode === 404) return 'Deriv could not find the account (404). Select an account from “Look Up My Accounts” instead of entering a legacy Login ID.';
    return msg ? `Deriv ${statusCode}: ${msg}` : `Deriv request failed (HTTP ${statusCode}).`;
  }

  async function request(path, options = {}) {
    const appId = read('dtAppId');
    const token = read('dtToken');
    if (!appId || !token) throw new Error('Enter your Deriv App ID and API token first.');
    const res = await fetch(API + path, { ...options, headers: { 'Deriv-App-ID': appId, 'Authorization': 'Bearer ' + token, ...(options.headers || {}) } });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!res.ok) throw new Error(friendlyError(res.status, data || text));
    return data;
  }

  function normalizeAccounts(payload) {
    const raw = payload?.data ?? payload?.accounts ?? [];
    const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    return arr.map(a => ({
      id: a.account_id || a.accountId || a.id || a.loginid || a.login_id,
      type: String(a.account_type || a.type || '').toLowerCase(),
      currency: a.currency || 'USD', balance: a.balance, status: a.status || 'active'
    })).filter(a => a.id);
  }

  async function lookupAccounts() {
    const btn = $('btnDtLookup');
    if (btn) { btn.disabled = true; btn.textContent = 'Checking Deriv…'; }
    try {
      status('🔎 Looking up your Deriv accounts…');
      const payload = await request('/accounts');
      const accounts = normalizeAccounts(payload);
      if (!accounts.length) throw new Error('No Options trading accounts were returned for this token. Make sure the token has the trade scope.');
      const select = $('dtAccountSelect');
      const field = $('dtAccountField');
      if (!select) throw new Error('Account selector is missing from the app.');
      select.innerHTML = '';
      accounts.forEach(a => {
        const o = document.createElement('option');
        o.value = a.id;
        const bal = a.balance == null ? '' : ` · ${a.currency} ${a.balance}`;
        o.textContent = `${a.id} — ${a.type === 'real' ? 'REAL' : 'DEMO'}${bal}`;
        select.appendChild(o);
      });
      if (field) field.classList.remove('hidden');
      $('btnDtConnect')?.classList.remove('hidden');
      status(`🟢 Found ${accounts.length} account${accounts.length === 1 ? '' : 's'}. Select one, then Connect & Verify.`);
      return accounts;
    } catch (e) {
      status('❌ ' + e.message);
      return [];
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Look Up My Accounts'; }
    }
  }

  async function connect() {
    const accountId = read('dtAccountSelect');
    if (!accountId) { status('❌ Look up your accounts and select an account first.'); return; }
    manualDisconnect = false;
    try {
      if (tradingWs) { try { tradingWs.onclose = null; tradingWs.close(); } catch (_) {} tradingWs = null; }
      derivExec.appId = read('dtAppId');
      derivExec.token = read('dtToken');
      derivExec.loginId = accountId;
      derivExec.multiplier = parseFloat(read('dtMultiplier')) || 100;
      derivExec.dailyLossLimit = parseFloat(read('dtDailyLimit')) || null;
      derivExec.maxConcurrent = parseInt(read('dtMaxConcurrent'), 10) || 3;
      derivExec.authorized = false; derivExec.accountInfo = null;
      await save();
      status('🔐 Requesting a fresh Deriv trading session…');

      const payload = await request(`/accounts/${encodeURIComponent(accountId)}/otp`, { method: 'POST' });
      const wsUrl = payload?.data?.url || payload?.url;
      if (!wsUrl) throw new Error('Deriv did not return a WebSocket URL. Check that the token has trade permission.');

      tradingWs = new WebSocket(wsUrl);
      tradingWs.onopen = () => {
        derivExec.authorized = true;
        const opt = $('dtAccountSelect')?.selectedOptions?.[0];
        const isReal = /REAL/i.test(opt?.textContent || '');
        derivExec.accountInfo = { loginid: accountId, account_id: accountId, is_virtual: !isReal };
        status(`🟢 Connected — ${accountId} (${isReal ? 'REAL MONEY' : 'DEMO'})`);
        if (typeof updateDailyStatus === 'function') updateDailyStatus();
      };
      tradingWs.onmessage = event => {
        let data; try { data = JSON.parse(event.data); } catch (_) { return; }
        if (data.error) {
          if (data.msg_type === 'buy' && typeof logExecutionResult === 'function') logExecutionResult(false, data.error.message || 'Deriv rejected the trade');
          return;
        }
        if (data.msg_type === 'buy') {
          const ctx = lastTradeContext || { type: 'multiplier', symbol: currentSymbol };
          if (typeof logExecutionResult === 'function') logExecutionResult(true, `Contract ${data.buy.contract_id} opened at stake $${(+data.buy.buy_price).toFixed(2)}`, data.buy.contract_id, ctx.symbol, ctx.type);
          return;
        }
        if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract && typeof handleContractUpdate === 'function') handleContractUpdate(data.proposal_open_contract);
      };
      tradingWs.onerror = () => status('❌ Deriv WebSocket connection failed.');
      tradingWs.onclose = () => {
        derivExec.authorized = false;
        if (manualDisconnect) return;
        status('🟡 Trading session ended — requesting a fresh session…');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => { if (read('dtToken') && read('dtAccountSelect')) connect(); }, 5000);
      };
      await save();
    } catch (e) {
      derivExec.authorized = false;
      status('❌ ' + e.message);
      try { if (tradingWs) { tradingWs.onclose = null; tradingWs.close(); } } catch (_) {}
      tradingWs = null;
    }
  }

  function bind() {
    if (fixBound || !$('btnDtLookup')) return;
    fixBound = true;
    $('btnDtLookup').onclick = lookupAccounts;
    $('btnDtConnect').onclick = connect;

    window.loadDerivExec = async function() {
      if (typeof session === 'undefined' || !session?.u || typeof storeGet !== 'function') return;
      const saved = (await storeGet('autoexec:' + session.u, false)) || {};
      derivExec = Object.assign({ appId:'', loginId:'', token:'', multiplier:100, enabled:false, authorized:false, accountInfo:null, dailyLossLimit:null, maxConcurrent:3 }, saved, { authorized:false, accountInfo:null });
      if ($('dtAppId')) $('dtAppId').value = derivExec.appId || '';
      if ($('dtToken')) $('dtToken').value = derivExec.token || '';
      if ($('dtMultiplier')) $('dtMultiplier').value = derivExec.multiplier || 100;
      if ($('dtDailyLimit')) $('dtDailyLimit').value = derivExec.dailyLossLimit ?? '';
      if ($('dtMaxConcurrent')) $('dtMaxConcurrent').value = derivExec.maxConcurrent ?? 3;
      if (derivExec.loginId && $('dtAccountSelect')) {
        const opt = document.createElement('option'); opt.value = derivExec.loginId; opt.textContent = derivExec.loginId + ' — saved account';
        $('dtAccountSelect').appendChild(opt); $('dtAccountSelect').value = derivExec.loginId;
        $('dtAccountField')?.classList.remove('hidden'); $('btnDtConnect')?.classList.remove('hidden');
      }
      if (typeof updateDtToggleUI === 'function') updateDtToggleUI();
      if (typeof updateDailyStatus === 'function') updateDailyStatus();
      if (derivExec.appId && derivExec.token && derivExec.loginId) connect();
    };
  }

  function start() {
    bind();
    const observer = new MutationObserver(() => bind());
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
