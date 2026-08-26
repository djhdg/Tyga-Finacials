/* Tyga Financials — admin-only Deriv configuration.
 * The App ID is public client configuration, while tokens remain user/admin supplied.
 */
(() => {
  'use strict';
  const ADMIN_APP_ID = '33RjDEzNNzFBobSNzhwrD';
  const ADMIN_KEY = 'tygaAdminDerivConfigV1';
  const getAdmin = () => { try { return localStorage.getItem(ADMIN_KEY) === '1'; } catch (_) { return false; } };
  window.TygaDerivConfig = Object.freeze({
    appId: ADMIN_APP_ID,
    isAdmin: getAdmin(),
    canConfigure: getAdmin()
  });
  window.setTygaAdminDerivAccess = (enabled) => {
    try { localStorage.setItem(ADMIN_KEY, enabled ? '1' : '0'); } catch (_) {}
    window.TygaDerivConfig = Object.freeze({appId: ADMIN_APP_ID,isAdmin:!!enabled,canConfigure:!!enabled});
    return window.TygaDerivConfig;
  };
})();
