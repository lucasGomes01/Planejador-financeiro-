import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { sessionStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

/** URL the web app was opened with (read before Supabase cleans the auth params from it). */
const initialUrl = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : '';

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

/*
 * Password recovery.
 * Supabase fires PASSWORD_RECOVERY while it initializes, i.e. possibly before any React
 * component subscribes. Listen right here, at creation, and keep the flag until the user
 * sets a new password.
 */
let recovering = /[#&?]type=recovery\b/.test(initialUrl);
const recoveryListeners = new Set<(v: boolean) => void>();
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setRecovering(true);
  if (event === 'SIGNED_OUT') setRecovering(false);
});
function setRecovering(v: boolean) {
  recovering = v;
  recoveryListeners.forEach((fn) => fn(v));
}
export const recovery = {
  get: () => recovering,
  clear: () => setRecovering(false),
  subscribe: (fn: (v: boolean) => void) => {
    recoveryListeners.add(fn);
    return () => { recoveryListeners.delete(fn); };
  },
};

/**
 * If the app was opened from an e-mail link (confirmation or password reset) that did not work,
 * returns a message explaining why. Call after getSession() resolved without a session.
 */
export function authLinkProblem(): string | null {
  if (!initialUrl) return null;
  const u = new URL(initialUrl);
  const params = new URLSearchParams([u.search.slice(1), u.hash.slice(1)].filter(Boolean).join('&'));
  const code = params.get('error_code');
  if (params.get('error') || code) {
    if (code === 'otp_expired') return 'Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".';
    return 'O link do e-mail não é válido. Peça um novo em "Esqueci minha senha".';
  }
  if (params.get('code')) {
    return 'Não foi possível usar o link. Abra o link no mesmo navegador (e aparelho) em que você pediu a redefinição, ou peça um novo.';
  }
  return null;
}

// Only refresh tokens while the app is in the foreground (native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
