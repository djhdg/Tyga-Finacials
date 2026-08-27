/* Tyga Financials — desktop workspace compatibility layer.
 * The previous workspace created a fixed overlay that covered the real app views.
 * Desktop now uses the real mobile feature views directly, with desktop-nav.js
 * providing the right-side navigation. Keep this file as a cleanup/no-overlay layer.
 */
(() => {
  'use strict';
  if (window.__tygaDesktopWorkspaceFixed) return;
  window.__tygaDesktopWorkspaceFixed = true;

  // Remove any stale workspace injected by an older cached version.
  const removeOverlay = () => {
    const old = document.getElementById('tygaDesktopWorkspace');
    if (old) old.remove();
    const staleStyles = [...document.querySelectorAll('style')].filter(style =>
      /#tygaDesktopWorkspace/.test(style.textContent || '')
    );
    staleStyles.forEach(style => style.remove());
  };

  if (window.innerWidth >= 900) {
    removeOverlay();
    // Leave the application's original feature views fully interactive.
    document.documentElement.classList.add('tyga-desktop-real-views');
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) removeOverlay();
  });
})();
