import type { Goal, Investment, Snapshot, Transaction } from './types';
import { addMonths, currentYM, goalProjection, growHoldings, monthSummary, monthlyYield, monthsBetween, ymOf } from './finance';
import { money, monthShort as monthLabel, todayISO } from './format';

/**
 * Progress and projection of a goal.
 *
 * Every future month i (1 = next month) the goal receives:
 * - base part:
 *   - mode 'fixed'   → goal.monthly_contribution
 *   - mode 'surplus' → surplus of month i itself (income − fixed and one-time expenses,
 *                      not counting incomes earmarked for any goal) × surplus_percent.
 *                      Each chart point is the balance at the END of its month. The current
 *                      month has not ended yet, so its surplus is added in month 1.
 * - plus one-time incomes earmarked for this goal:
 *   - dated after the last balance update of the goal's places (and up to today) count now,
 *     as "a depositar" (received but not yet inside a balance);
 *   - dated in the future enter in their month (this month → next month);
 *   - older ones are assumed to be already inside the updated balances.
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
    const i = Math.max(1, monthsBetween(now, ymOf(t.date)));
    lumps.set(i, (lumps.get(i) ?? 0) + t.amount);
  }
  const future = futureItems.reduce((s, t) => s + t.amount, 0);

  /** Month's surplus without incomes earmarked for goals (those are counted separately). */
  const freeSurplus = (ym: string) => {
    const sum = monthSummary(transactions, ym);
    const earmarkedIn = sum.items
      .filter((t) => t.goal_id && t.kind === 'income')
      .reduce((s, t) => s + t.amount, 0);
    return sum.net - earmarkedIn;
  };
  const surplusMode = goal.contribution_mode === 'surplus';
  const pct = (goal.surplus_percent ?? 100) / 100;
  /** base part entering in month i */
  const baseAt = (i: number) => {
    if (!surplusMode) return goal.monthly_contribution;
    const own = freeSurplus(addMonths(now, i));
    return (i === 1 ? own + freeSurplus(now) : own) * pct;
  };
  const contributionAt = (i: number) => baseAt(i) + (lumps.get(i) ?? 0);

  const saved = inAccounts + pending;
  const holdings = parts.map((p) => ({ value: p.value, inv: p.inv }));
  const proj = goalProjection({
    holdings, cdiAnnual, contributionAt, target: goal.target_amount, startExtra: pending,
  });
  const reachYM = proj.months != null ? addMonths(now, proj.months) : null;

  /** How much per month you'd need to save to hit target_date (on top of yield + earmarked incomes). */
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

  /** Average base contribution over the next 12 months (useful in surplus mode). */
  let base12 = 0;
  for (let i = 1; i <= 12; i++) base12 += baseAt(i);
  const avgBase = base12 / 12;

  /** Breakdown of what enters in a given future month (for the chart tooltip). */
  const detailAt = (ym: string) => {
    const i = monthsBetween(now, ym);
    const out: { label: string; value: number; hint?: string }[] = [];
    if (surplusMode) {
      const pctLabel = `${String(goal.surplus_percent).replace('.', ',')}%`;
      const months = i === 1 ? [now, ym] : [ym];
      for (const m of months) {
        const sum = monthSummary(transactions, m);
        const earmarkedIn = sum.items.filter((t) => t.goal_id && t.kind === 'income').reduce((a, t) => a + t.amount, 0);
        out.push({
          label: `${pctLabel} da sobra de ${monthLabel(m)}${m === now ? ' (mês atual)' : ''}`,
          value: freeSurplus(m) * pct,
          hint: `ganhos ${money(sum.income - earmarkedIn)} − custos ${money(sum.expense)} (fixos ${money(sum.fixedExpense)} + pontuais ${money(sum.oneTimeExpense)})`,
        });
      }
    } else {
      out.push({ label: 'Aporte fixo da meta', value: goal.monthly_contribution, hint: 'Valor fixo: não considera ganhos e custos lançados.' });
    }
    const lump = lumps.get(i);
    if (lump) out.push({ label: 'Ganhos pontuais destinados', value: lump });
    return out;
  };

  /** What enters the goal in a given future month (for charts). */
  const contribution = (ym: string) => contributionAt(monthsBetween(now, ym));

  return {
    contribution, detailAt, linkedIds, avgBase, nextBase: baseAt(1), surplusMode,
    parts, inAccounts, pending, pendingItems, future, futureItems, saved,
    progress: Math.min(1, saved / goal.target_amount),
    monthlyYield: proj.monthlyYield, months: proj.months, reachYM, path: proj.path, neededMonthly,
  };
}
