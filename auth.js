// ============================================================
// MONA INVEST — auth.js
// Supabase Authentication Module
// ============================================================

(function () {
  'use strict';

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

  // Clear any stale auth locks left by previous sessions (iOS PWA issue)
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('lock:'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}

  // Initialize Supabase client (using the UMD bundle from CDN)
  const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'mona-invest-auth',
    },
  });

  // Expose the client globally so other modules can use it
  window._supabase = _supabase;

  // ── Auth Actions ────────────────────────────────────────────

  async function loginWithEmail(email, password) {
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function registerWithEmail(email, password, fullName) {
    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }

  async function loginWithGoogle() {
    const { data, error } = await _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  }

  async function loginWithApple() {
    const { data, error } = await _supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  }

  async function logout() {
    const { error } = await _supabase.auth.signOut();
    if (error) throw error;
  }

  async function getSession() {
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  async function getUser() {
    const { data: { user }, error } = await _supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  function onAuthStateChange(callback) {
    return _supabase.auth.onAuthStateChange(callback);
  }

  // ── UI Helpers ──────────────────────────────────────────────

  function showAuthScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  function showLoadingScreen() {
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  // ── Auth Form Handling ──────────────────────────────────────

  function initAuthForms() {
    // Tab switching
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById(`${tab}-form`).classList.remove('hidden');
      });
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = e.target.querySelector('button[type="submit"]');
      const errEl = document.getElementById('login-error');

      setButtonLoading(btn, true);
      errEl.textContent = '';

      try {
        await loginWithEmail(email, password);
        // onAuthStateChange will trigger app init
      } catch (err) {
        errEl.textContent = translateAuthError(err.message);
      } finally {
        setButtonLoading(btn, false);
      }
    });

    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const btn = e.target.querySelector('button[type="submit"]');
      const errEl = document.getElementById('register-error');

      if (password.length < 8) {
        errEl.textContent = 'Le mot de passe doit contenir au moins 8 caractères.';
        return;
      }

      setButtonLoading(btn, true);
      errEl.textContent = '';

      try {
        await registerWithEmail(email, password, fullName);
        // onAuthStateChange will trigger app init
      } catch (err) {
        errEl.textContent = translateAuthError(err.message);
      } finally {
        setButtonLoading(btn, false);
      }
    });

    // Google OAuth
    document.querySelectorAll('.btn-google').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await loginWithGoogle();
        } catch (err) {
          console.error('Google auth error:', err);
        }
      });
    });

    // Apple OAuth
    document.querySelectorAll('.btn-apple').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await loginWithApple();
        } catch (err) {
          console.error('Apple auth error:', err);
        }
      });
    });
  }

  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Chargement…';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
      btn.disabled = false;
    }
  }

  function translateAuthError(msg) {
    const translations = {
      'Invalid login credentials': 'Email ou mot de passe incorrect.',
      'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter.',
      'User already registered': 'Un compte existe déjà avec cet email.',
      'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
      'signup_disabled': 'Les inscriptions sont temporairement désactivées.',
    };
    return translations[msg] || msg;
  }

  // ── Logout button ───────────────────────────────────────────
  document.addEventListener('click', async (e) => {
    if (e.target.closest('#logout-btn')) {
      try {
        await logout();
        showAuthScreen();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  });

  // ── Public API ──────────────────────────────────────────────
  window.Auth = {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loginWithApple,
    logout,
    getSession,
    getUser,
    onAuthStateChange,
    showAuthScreen,
    showLoadingScreen,
    initAuthForms,
  };
})();
