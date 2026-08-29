/* Loads Firebase auth enhancements on every web viewport, then the desktop workspace. */
(() => {
  const auth=document.createElement('script');
  auth.src='./firebase-auth.js'; auth.defer=true;
  document.head.appendChild(auth);

  if (window.innerWidth < 900 || document.getElementById('tygaDesktopWorkspace')) return;
  const s=document.createElement('script');
  s.src='./desktop-workspace.js'; s.defer=true;
  document.head.appendChild(s);
})();
