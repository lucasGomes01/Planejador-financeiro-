import type { Goal, Investment } from './types';
import { addMonths, currentYM, goalProjection, monthlyRate, monthsBetween } from './finance';

export function goalStatus(goal: Goal, investments: Investment[], balances: Map<string, number>, cdiAnnual: number) {
  const linked = investments.filter((i) => i.goal_id === goal.id);
  const parts = linked.map((i) => ({ inv: i, value: balances.get(i.id) ?? 0, rate: monthlyRate(cdiAnnual, i.cdi_percent) }));
  const saved = parts.reduce((s, p) => s + p.value, 0);
  const proj = goalProjection({ current: parts, monthlyContribution: goal.monthly_contribution, target: goal.target_amount });
  const reachYM = proj.months != null ? addMonths(currentYM(), proj.months) : null;

  let neededMonthly: number | null = null;
  if (goal.target_date) {
    const n = monthsBetween(currentYM(), goal.target_date.slice(0, 7));
    if (n > 0) {
      const fvCurrent = parts.reduce((s, p) => s + p.value * Math.pow(1 + p.rate, n), 0);
      const r = proj.avgRate;
      const missing = goal.target_amount - fvCurrent;
      neededMonthly = missing <= 0 ? 0 : r > 0 ? (missing * r) / (Math.pow(1 + r, n) - 1) : missing / n;
    }
  }
  return {
    parts, saved, progress: Math.min(1, saved / goal.target_amount),
    monthlyYield: proj.monthlyYield, months: proj.months, reachYM, path: proj.path, neededMonthly,
  };
}
