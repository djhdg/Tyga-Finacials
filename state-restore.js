(() => {
  'use strict';
  // Browser cache/storage can be cleared independently of the repository. Restore only
  // non-secret UI defaults; never restore passwords, tokens, or account credentials.
  const defaults = {
    tygaRiskSettingsV1: {mode:'paper',maxStake:10,maxDailyLoss:25,maxConsecutiveLosses:3,maxTradesPerHour:10,cooldownSeconds:60}
  };
  for (const [key,value] of Object.entries(defaults)) {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
  }
  window.TygaRestoreState = { defaultsRestored: true };
})();
