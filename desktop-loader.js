/* Loads the feature-complete desktop workspace after the existing desktop navigation. */
(() => {
  if (window.innerWidth < 900 || document.getElementById('tygaDesktopWorkspace')) return;
  const s=document.createElement('script');
  s.src='./desktop-workspace.js'; s.defer=true;
  document.head.appendChild(s);
})();
