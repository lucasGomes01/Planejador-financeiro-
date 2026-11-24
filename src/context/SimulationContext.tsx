import { createContext, useContext, useState, type ReactNode } from 'react';
import type { IncomeSimulation } from '../lib/finance';

interface SimulationState {
  /** null = no simulation running */
  sim: IncomeSimulation | null;
  setSim: (s: IncomeSimulation | null) => void;
}

const Ctx = createContext<SimulationState | null>(null);

/** Shared "what if" income scenario (kept in memory only, never saved). */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const [sim, setSim] = useState<IncomeSimulation | null>(null);
  return <Ctx.Provider value={{ sim, setSim }}>{children}</Ctx.Provider>;
}

export function useSimulation() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSimulation must be used inside SimulationProvider');
  return v;
}
