import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';
import { prefs } from '../lib/secureStorage';
import { Button } from './ui';
import { colors } from './theme';

/** Minutes in background before the biometric lock kicks in (native). */
const LOCK_AFTER_MS = 60_000;
/** Web: sign out after this long without interaction. */
const WEB_IDLE_MS = 15 * 60_000;

export const BIOMETRIC_PREF = 'biometricLock';

/**
 * Extra protection layer:
 * - Native: optional fingerprint/face lock when the app returns from background.
 * - Web: automatic sign-out after inactivity.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [locked, setLocked] = useState(false);
  const bgSince = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear Planejador',
      cancelLabel: 'Cancelar',
    });
    if (res.success) setLocked(false);
  }, []);

  // Native: biometric lock on cold start + after background
  useEffect(() => {
    if (Platform.OS === 'web' || !session) return;
    let active = true;
    const shouldLock = async () => (await prefs.get(BIOMETRIC_PREF)) === '1';
    shouldLock().then((on) => { if (on && active) setLocked(true); });
    const sub = AppState.addEventListener('change', async (st) => {
      if (st === 'background') bgSince.current = Date.now();
      if (st === 'active' && bgSince.current && Date.now() - bgSince.current > LOCK_AFTER_MS && (await shouldLock())) {
        setLocked(true);
      }
      if (st === 'active') bgSince.current = null;
    });
    return () => { active = false; sub.remove(); };
  }, [session?.user.id]);

  useEffect(() => { if (locked) unlock(); }, [locked, unlock]);

  // Web: idle sign-out
  useEffect(() => {
    if (Platform.OS !== 'web' || !session || typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(timer); timer = setTimeout(signOut, WEB_IDLE_MS); };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [session?.user.id, signOut]);

  if (locked && session) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg, gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>App bloqueado</Text>
        <Button title="Desbloquear" onPress={unlock} />
        <Button title="Sair da conta" variant="ghost" onPress={() => { setLocked(false); signOut(); }} />
      </View>
    );
  }
  return <>{children}</>;
}
