import type { Investment, Snapshot, Transaction } from './types';

/** "YYYY-MM" helpers */
export const ymOf = (iso: string) => iso.slice(0, 7);
export const currentYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export const monthsBetween = (a: string, b: string) => {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
};
const endOfMonthISO = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, '0')}`;
};

/** Does this transaction count in month `ym`? */
export function appliesTo(t: Transaction, ym: string): boolean {
  if (t.recurrence === 'one_time') return ymOf(t.date) === ym;
  if (ymOf(t.date) > ym) return false;
  return !t.end_date || ymOf(t.end_date) >= ym;
}

export function monthSummary(txs: Transaction[], ym: string) {
  const items = txs.filter((t) => appliesTo(t, ym));
  const sum = (f: (t: Transaction) => boolean) => items.filter(f).reduce((s, t) => s + Number(t.amount), 0);
  const fixedIncome = sum((t) => t.kind === 'income' && t.recurrence === 'fixed');
  const oneTimeIncome = sum((t) => t.kind === 'income' && t.recurrence === 'one_time');
  const fixedExpense = sum((t) => t.kind === 'expense' && t.recurrence === 'fixed');
  const oneTimeExpense = sum((t) => t.kind === 'expense' && t.recurrence === 'one_time');
  const income = fixedIncome + oneTimeIncome;
  const expense = fixedExpense + oneTimeExpense;
  return { items, fixedIncome, oneTimeIncome, fixedExpense, oneTimeExpense, income, expense, net: income - expense };
}

/** Latest balance of each investment on or before `isoDate` (default: now). */
export function balancesAt(snapshots: Snapshot[], isoDate?: string): Map<string, number> {
  const best = new Map<string, Snapshot>();
  for (const s of snapshots) {
    if (isoDate && s.date > isoDate) continue;
    const cur = best.get(s.investment_id);
    if (!cur || s.date > cur.date) best.set(s.investment_id, s);
  }
  return new Map([...best].map(([k, v]) => [k, Number(v.amount)]));
}

export function totalOf(balances: Map<string, number>, ids: Iterable<string>) {
  let total = 0;
  for (const id of ids) total += balances.get(id) ?? 0;
  return total;
}

/** Monthly rate for an investment given the annual CDI (e.g. 14.9) and % of CDI (e.g. 105). */
export const monthlyRate = (cdiAnnual: number, cdiPercent: number | null) =>
  cdiPercent == null ? 0 : Math.pow(1 + (cdiAnnual / 100) * (cdiPercent / 100), 1 / 12) - 1;

export interface SeriesPoint { ym: string; value: number; projected?: boolean }

/**
 * Total balance per month of the selected investments.
 * Past months use recorded snapshots (carrying the last value forward).
 * Optional projection: CDI yield + the planned monthly net (income − expenses).
 */
export function balanceSeries(opts: {
  snapshots: Snapshot[];
  investments: Investment[];
  selected: Set<string>;
  monthsBack: number;
  monthsAhead: number;
  cdiAnnual: number;
  transactions: Transaction[];
  includeNetInProjection: boolean;
}): SeriesPoint[] {
  const { snapshots, investments, selected, monthsBack, monthsAhead, cdiAnnual } = opts;
  const now = currentYM();
  const points: SeriesPoint[] = [];
  const snaps = snapshots.filter((s) => selected.has(s.investment_id));

  for (let i = monthsBack; i >= 0; i--) {
    const ym = addMonths(now, -i);
    const bal = balancesAt(snaps, i === 0 ? undefined : endOfMonthISO(ym));
    points.push({ ym, value: totalOf(bal, selected) });
  }

  if (monthsAhead > 0) {
    const bal = balancesAt(snaps);
    const per = investments
      .filter((inv) => selected.has(inv.id))
      .map((inv) => ({ value: bal.get(inv.id) ?? 0, rate: monthlyRate(cdiAnnual, inv.cdi_percent) }));
    const totalNow = per.reduce((s, p) => s + p.value, 0);
    const avgRate = totalNow > 0 ? per.reduce((s, p) => s + p.value * p.rate, 0) / totalNow : 0;
    let extra = 0; // contributions from planned net, growing at the average rate
    for (let i = 1; i <= monthsAhead; i++) {
      const ym = addMonths(now, i);
      for (const p of per) p.value *= 1 + p.rate;
      if (opts.includeNetInProjection) {
        extra = extra * (1 + avgRate) + monthSummary(opts.transactions, ym).net;
      }
      points.push({ ym, value: per.reduce((s, p) => s + p.value, 0) + extra, projected: true });
    }
  }
  return points;
}

/** Simulates a goal: how many months until `target` is reached. */
export function goalProjection(opts: {
  current: { value: number; rate: number }[];
  monthlyContribution: number;
  target: number;
  maxMonths?: number;
}) {
  const per = opts.current.map((c) => ({ ...c }));
  const total0 = per.reduce((s, p) => s + p.value, 0);
  const avgRate = total0 > 0 ? per.reduce((s, p) => s + p.value * p.rate, 0) / total0 : per[0]?.rate ?? 0;
  let contrib = 0;
  const path: number[] = [total0];
  const max = opts.maxMonths ?? 600;
  let months: number | null = total0 >= opts.target ? 0 : null;
  for (let i = 1; i <= max && months == null; i++) {
    for (const p of per) p.value *= 1 + p.rate;
    contrib = contrib * (1 + avgRate) + opts.monthlyContribution;
    const total = per.reduce((s, p) => s + p.value, 0) + contrib;
    path.push(total);
    if (total >= opts.target) months = i;
  }
  const monthlyYield = per.length ? opts.current.reduce((s, c) => s + c.value * c.rate, 0) : 0;
  return { months, path, monthlyYield, avgRate };
}
