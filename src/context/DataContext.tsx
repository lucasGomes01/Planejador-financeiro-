import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Goal, Investment, Settings, Snapshot, Transaction } from '../lib/types';
import { balancesAt } from '../lib/finance';
import { todayISO } from '../lib/format';
import { useAuth } from './AuthContext';

type NewTx = Omit<Transaction, 'id'>;
type NewInv = Omit<Investment, 'id'>;
type NewGoal = Omit<Goal, 'id'>;

interface DataState {
  loading: boolean;
  error: string | null;
  transactions: Transaction[];
  investments: Investment[];
  snapshots: Snapshot[];
  goals: Goal[];
  settings: Settings;
  balances: Map<string, number>;
  reload: () => Promise<void>;
  addTransaction: (t: NewTx) => Promise<void>;
  updateTransaction: (id: string, t: Partial<NewTx>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addInvestment: (i: NewInv, initialBalance?: number) => Promise<void>;
  updateInvestment: (id: string, i: Partial<NewInv>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  setBalance: (investmentId: string, amount: number, date?: string) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  addGoal: (g: NewGoal) => Promise<string>;
  updateGoal: (id: string, g: Partial<NewGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);
const DEFAULT_SETTINGS: Settings = { cdi_annual_rate: 14.9 };

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, needsMfa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const reload = useCallback(async () => {
    if (!session || needsMfa) return;
    setError(null);
    try {
      const [tx, inv, snap, gl, st] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('investments').select('*').order('created_at'),
        supabase.from('balance_snapshots').select('*').order('date'),
        supabase.from('goals').select('*').order('created_at'),
        supabase.from('user_settings').select('cdi_annual_rate').maybeSingle(),
      ]);
      const num = <T extends object>(rows: T[], keys: (keyof T)[]) =>
        rows.map((r) => {
          const o = { ...r };
          for (const k of keys) if (o[k] != null) (o as Record<keyof T, unknown>)[k] = Number(o[k]);
          return o;
        });
      setTransactions(num(check(tx) as Transaction[], ['amount']));
      setInvestments(num(check(inv) as Investment[], ['cdi_percent', 'cdi_limit', 'cdi_percent_above']));
      setSnapshots(num(check(snap) as Snapshot[], ['amount']));
      setGoals(num(check(gl) as Goal[], ['target_amount', 'monthly_contribution', 'surplus_percent']));
      const s = check(st) as Settings | null;
      setSettings(s ? { cdi_annual_rate: Number(s.cdi_annual_rate) } : DEFAULT_SETTINGS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session, needsMfa]);

  useEffect(() => {
    if (session && !needsMfa) {
      setLoading(true);
      reload();
    } else {
      setTransactions([]); setInvestments([]); setSnapshots([]); setGoals([]); setSettings(DEFAULT_SETTINGS);
    }
  }, [session?.user.id, needsMfa, reload]);

  const run = useCallback(
    async (fn: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
      check(await fn());
      await reload();
    },
    [reload],
  );

  const value = useMemo<DataState>(() => ({
    loading, error, transactions, investments, snapshots, goals, settings,
    balances: balancesAt(snapshots),
    reload,
    addTransaction: (t) => run(() => supabase.from('transactions').insert(t)),
    updateTransaction: (id, t) => run(() => supabase.from('transactions').update(t).eq('id', id)),
    deleteTransaction: (id) => run(() => supabase.from('transactions').delete().eq('id', id)),
    addInvestment: async (i, initialBalance) => {
      const row = check(await supabase.from('investments').insert(i).select('id').single()) as { id: string };
      if (initialBalance != null && initialBalance >= 0) {
        check(await supabase.from('balance_snapshots').insert({ investment_id: row.id, amount: initialBalance, date: todayISO() }));
      }
      await reload();
    },
    updateInvestment: (id, i) => run(() => supabase.from('investments').update(i).eq('id', id)),
    deleteInvestment: (id) => run(() => supabase.from('investments').delete().eq('id', id)),
    setBalance: (investmentId, amount, date) =>
      run(() => supabase.from('balance_snapshots').upsert(
        { investment_id: investmentId, amount, date: date ?? todayISO() },
        { onConflict: 'user_id,investment_id,date' },
      )),
    deleteSnapshot: (id) => run(() => supabase.from('balance_snapshots').delete().eq('id', id)),
    addGoal: async (g) => {
      const row = check(await supabase.from('goals').insert(g).select('id').single()) as { id: string };
      await reload();
      return row.id;
    },
    updateGoal: (id, g) => run(() => supabase.from('goals').update(g).eq('id', id)),
    deleteGoal: (id) => run(() => supabase.from('goals').delete().eq('id', id)),
    saveSettings: (s) => run(() => supabase.from('user_settings').upsert({ user_id: session!.user.id, ...s })),
  }), [loading, error, transactions, investments, snapshots, goals, settings, reload, run, session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}
