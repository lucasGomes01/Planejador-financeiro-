import type { Goal, Investment, Snapshot, Transaction } from './types';
import { addMonths, currentYM, goalProjection, growHoldings, monthlyYield, monthsBetween, ymOf } from './finance';
import { todayISO } from './format';

/**
 * Progress and projection of a goal.
 *
 * One-time incomes earmarked for the goal:
 * - dated after the last balance update of the goal's places (and up to today) are counted as
 *   "a depositar" — money received but not yet reflected in a balance;
 * - dated in the future are added to the projection in their month;
 * - older ones are assumed to be already inside the updated balances.
 */
export function goalStatus(
  goal: Goal, investments: Investment[], balances: Map<string, number>, cdiAnnual: number,
  transactions: Transaction[] = [], snapshots: Snapshot[] = [],
) {
  const linked = investments.filter((i) => i.goal_id === goal.id);
  const linkedIds = new Set(linked.map((i) => i.id));
  const parts = linked.map((i) => {
    const value = balances.get(i.id) ?? 0;
    return { inv: i, value, yield: monthlyYield(cdiAnnual, i, value) };
  });
  const inAccounts = parts.reduce((s, p) => s + p.value, 0);

  const lastUpdate = snapshots.filter((s) => linkedIds.has(s.investment_id)).reduce((m, s) => (s.date > m ? s.date : m), '');
  const today = todayISO();
  const now = currentYM();
  const earmarked = transactions.filter((t) => t.goal_id === goal.id && t.kind === 'income' && t.recurrence === 'one_time');
  const pendingItems = earmarked.filter((t) => t.date > lastUpdate && t.date <= today);
  const futureItems = earmarked.filter((t) => t.date > today);
  const pending = pendingItems.reduce((s, t) => s + t.amount, 0);
  const lumps = new Map<number, number>();
  for (const t of futureItems) {
    // still this month → counts next month in the simulation
    const i = Math.max(1, monthsBetween(now, ymOf(t.date)));
    lumps.set(i, (lumps.get(i) ?? 0) + t.amount);
  }
  const future = futureItems.reduce((s, t) => s + t.amount, 0);

  const saved = inAccounts + pending;
  const holdings = parts.map((p) => ({ value: p.value, inv: p.inv }));
  const proj = goalProjection({
    holdings, cdiAnnual, monthlyContribution: goal.monthly_contribution, target: goal.target_amount,
    startExtra: pending, lumps,
  });
  const reachYM = proj.months != null ? addMonths(now, proj.months) : null;

  let neededMonthly: number | null = null;
  if (goal.target_date) {
    const n = monthsBetween(now, goal.target_date.slice(0, 7));
    if (n > 0) {
      const r = proj.avgRate;
      let fv = growHoldings(holdings, cdiAnnual, n) + pending * Math.pow(1 + r, n);
      for (const [m, v] of lumps) if (m <= n) fv += v * Math.pow(1 + r, n - m);
      const missing = goal.target_amount - fv;
      neededMonthly = missing <= 0 ? 0 : r > 0 ? (missing * r) / (Math.pow(1 + r, n) - 1) : missing / n;
    }
  }
  const lumpsByYM = new Map<string, number>();
  for (const [i, v] of lumps) lumpsByYM.set(addMonths(now, i), v);
  /** What enters the goal in a given future month: planned contribution + earmarked incomes. */
  const contribution = (ym: string) => goal.monthly_contribution + (lumpsByYM.get(ym) ?? 0);
  return {
    contribution, linkedIds,
    parts, inAccounts, pending, pendingItems, future, futureItems, saved,
    progress: Math.min(1, saved / goal.target_amount),
    monthlyYield: proj.monthlyYield, months: proj.months, reachYM, path: proj.path, neededMonthly,
  };
}
