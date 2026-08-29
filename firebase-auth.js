/* Tyga Financials Firebase auth enhancements. */
(() => {
  const waitForFirebase = (done, tries = 0) => {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length && firebase.auth && firebase.firestore) {
        return done();
      }
    } catch (_) {}
    if (tries >= 80) return;
    setTimeout(() => waitForFirebase(done, tries + 1), 250);
  };

  const errorText = (e) => {
    const code = e && e.code;
    if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
    if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in popup. Allow popups for Tyga Financials and try again.';
    if (code === 'auth/operation-not-allowed') return 'Google Sign-In is not enabled in Firebase yet. Enable Google under Firebase Authentication → Sign-in method.';
    if (code === 'auth/network-request-failed') return 'Network error — check your connection and try again.';
    if (code === 'auth/account-exists-with-different-credential') return 'An account already exists with this email. Sign in with the existing method first, then link Google from your account settings.';
    return (e && e.message) || 'Google sign-in failed. Please try again.';
  };

  const getAuthBody = () => document.getElementById('authBody');

  const ensureGoogleButton = () => {
    const body = getAuthBody();
    if (!body || document.getElementById('btnGoogleSignIn')) return;
    if (!document.getElementById('btnLogin')) return;

    const card = document.querySelector('#authBody .auth-card');
    if (!card) return;

    const button = document.createElement('button');
    button.id = 'btnGoogleSignIn';
    button.className = 'btn-ghost';
    button.type = 'button';
    button.textContent = 'Continue with Google';
    button.onclick = signInWithGoogle;

    document.getElementById('btnLogin').insertAdjacentElement('afterend', button);
  };

  const showAuthMessage = (message) => {
    const el = document.getElementById('authMsg');
    if (el) el.innerHTML = `<div class="auth-error">${message}</div>`;
  };

  async function saveGoogleProfile(user) {
    const db = firebase.firestore();
    const ref = db.collection('users').doc(user.uid).collection('private').doc('profile');
    const existing = await ref.get();
    const current = existing.exists ? existing.data() : {};
    const profile = {
      ...current,
      uid: user.uid,
      provider: 'google.com',
      email: user.email || '',
      displayName: user.displayName || current.displayName || '',
      photoURL: user.photoURL || current.photoURL || '',
      updatedAt: Date.now(),
      createdAt: current.createdAt || Date.now()
    };
    await ref.set(profile, { merge: true });
    return profile;
  }

  async function signInWithGoogle() {
    if (!window.firebase) {
      showAuthMessage('Firebase is not ready yet — try again in a moment.');
      return;
    }

    const button = document.getElementById('btnGoogleSignIn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Connecting to Google…';
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (!user) throw new Error('Firebase did not return a signed-in user.');

      const profile = await saveGoogleProfile(user);
      window.session = {
        role: 'user',
        u: profile.displayName || profile.email || user.uid,
        authProvider: 'google.com',
        uid: user.uid
      };

      if (typeof window.storeSet === 'function') {
        await window.storeSet('session', window.session, false);
      }
      if (typeof window.enterApp === 'function') window.enterApp();
    } catch (e) {
      console.error('Google sign-in failed', e);
      showAuthMessage(errorText(e));
      if (button) {
        button.disabled = false;
        button.textContent = 'Continue with Google';
      }
    }
  }

  window.signInWithGoogle = signInWithGoogle;

  waitForFirebase(() => {
    const body = getAuthBody();
    if (!body) return;
    const observer = new MutationObserver(ensureGoogleButton);
    observer.observe(body, { childList: true, subtree: true });
    ensureGoogleButton();
  });
})();
