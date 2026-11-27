import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authLinkProblem, recovery, supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  /** true when the user has MFA enrolled but this session has not passed it yet */
  needsMfa: boolean;
  /** true after opening a password-reset link: the user must set a new password */
  recovering: boolean;
  finishRecovery: () => void;
  /** message when the app was opened from an e-mail link that did not work */
  linkError: string | null;
  refreshAal: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [recovering, setRecovering] = useState(recovery.get());
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => {
    // the event may have fired between the first render and this effect: re-read it
    setRecovering(recovery.get());
    return recovery.subscribe(setRecovering);
  }, []);

  const refreshAal = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setNeedsMfa(Boolean(data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'));
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await refreshAal();
      else setLinkError(authLinkProblem());
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Do not await Supabase calls inside this callback (can deadlock); defer.
      if (s) setTimeout(refreshAal, 0);
      else setNeedsMfa(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshAal]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return <Ctx.Provider value={{ session, loading, needsMfa, recovering, finishRecovery: recovery.clear, linkError, refreshAal, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
