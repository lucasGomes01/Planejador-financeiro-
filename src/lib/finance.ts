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

/** Monthly rate given the annual CDI (e.g. 14.9) and % of CDI (e.g. 105). */
export const monthlyRate = (cdiAnnual: number, cdiPercent: number | null) =>
  cdiPercent == null ? 0 : Math.pow(1 + (cdiAnnual / 100) * (cdiPercent / 100), 1 / 12) - 1;

type RateInfo = Pick<Investment, 'cdi_percent' | 'cdi_limit' | 'cdi_percent_above'>;

/**
 * Estimated yield for one month on `value`.
 * Supports tiers: cdi_percent up to cdi_limit, cdi_percent_above on the rest.
 */
export function monthlyYield(cdiAnnual: number, inv: RateInfo, value: number): number {
  if (inv.cdi_percent == null || value <= 0) return 0;
  const r1 = monthlyRate(cdiAnnual, inv.cdi_percent);
  if (inv.cdi_limit == null) return value * r1;
  const r2 = monthlyRate(cdiAnnual, inv.cdi_percent_above ?? 100);
  return Math.min(value, inv.cdi_limit) * r1 + Math.max(0, value - inv.cdi_limit) * r2;
}

export interface SeriesPoint {
  ym: string;
  value: number;
  projected?: boolean;
  /** projected points: yield earned from now until this month */
  gainYield?: number;
  /** projected points: contributions (planned net, earmarked incomes…) from now until this month */
  gainContrib?: number;
}

/** A holding being simulated month by month. */
export interface Holding { value: number; inv: RateInfo }

const totalYield = (hs: Holding[], cdi: number) => hs.reduce((s, h) => s + monthlyYield(cdi, h.inv, h.value), 0);
const avgRateOf = (hs: Holding[], cdi: number) => {
  const total = hs.reduce((s, h) => s + h.value, 0);
  if (total > 0) return totalYield(hs, cdi) / total;
  // nothing saved yet: use the first-tier rate of the first holding
  return hs[0] ? monthlyRate(cdi, hs[0].inv.cdi_percent) : 0;
};

/**
 * Total balance per month of the selected investments.
 * Past months use recorded snapshots (carrying the last value forward).
 * Projection: each holding's CDI yield + `contribution(ym)` added every month
 * (contributions grow at the holdings' average rate). `startExtra` is money that
 * already counts today but is not in any balance yet.
 */
export function balanceSeries(opts: {
  snapshots: Snapshot[];
  investments: Investment[];
  selected: Set<string>;
  monthsBack: number;
  monthsAhead: number;
  cdiAnnual: number;
  contribution?: (ym: string) => number;
  startExtra?: number;
}): SeriesPoint[] {
  const { snapshots, investments, selected, monthsBack, monthsAhead, cdiAnnual } = opts;
  const now = currentYM();
  const points: SeriesPoint[] = [];
  const snaps = snapshots.filter((s) => selected.has(s.investment_id));
  const startExtra = opts.startExtra ?? 0;

  for (let i = monthsBack; i >= 0; i--) {
    const ym = addMonths(now, -i);
    const bal = balancesAt(snaps, i === 0 ? undefined : endOfMonthISO(ym));
    points.push({ ym, value: totalOf(bal, selected) + (i === 0 ? startExtra : 0) });
  }

  if (monthsAhead > 0) {
    const bal = balancesAt(snaps);
    const hs: Holding[] = investments
      .filter((inv) => selected.has(inv.id))
      .map((inv) => ({ value: bal.get(inv.id) ?? 0, inv }));
    const avgRate = avgRateOf(hs, cdiAnnual);
    let extra = startExtra;
    let gainYield = 0;
    let gainContrib = 0;
    for (let i = 1; i <= monthsAhead; i++) {
      const ym = addMonths(now, i);
      for (const h of hs) {
        const y = monthlyYield(cdiAnnual, h.inv, h.value);
        h.value += y;
        gainYield += y;
      }
      const extraYield = extra * avgRate;
      const c = opts.contribution?.(ym) ?? 0;
      extra += extraYield + c;
      gainYield += extraYield;
      gainContrib += c;
      points.push({
        ym, value: hs.reduce((s, h) => s + h.value, 0) + extra, projected: true, gainYield, gainContrib,
      });
    }
  }
  return points;
}

/**
 * Simulates a goal month by month.
 * - holdings grow with their own (possibly tiered) CDI yield;
 * - `startExtra` is money already earmarked but not yet in the holdings;
 * - `contributionAt(i)` is what enters in month i (1 = next month);
 * - contributions grow at the holdings' average rate.
 */
export function goalProjection(opts: {
  holdings: Holding[];
  cdiAnnual: number;
  contributionAt: (i: number) => number;
  target: number;
  startExtra?: number;
  maxMonths?: number;
}) {
  const hs = opts.holdings.map((h) => ({ ...h }));
  const cdi = opts.cdiAnnual;
  const avgRate = avgRateOf(hs, cdi);
  const monthlyYieldNow = totalYield(hs, cdi);
  let contrib = opts.startExtra ?? 0;
  const total0 = hs.reduce((s, h) => s + h.value, 0) + contrib;
  const path: number[] = [total0];
  const max = opts.maxMonths ?? 600;
  let months: number | null = total0 >= opts.target ? 0 : null;
  for (let i = 1; i <= max && months == null; i++) {
    for (const h of hs) h.value += monthlyYield(cdi, h.inv, h.value);
    contrib = contrib * (1 + avgRate) + opts.contributionAt(i);
    const total = hs.reduce((s, h) => s + h.value, 0) + contrib;
    path.push(total);
    if (total >= opts.target) months = i;
  }
  return { months, path, monthlyYield: monthlyYieldNow, avgRate };
}

/** Value of the holdings after n months of yield only. */
export function growHoldings(holdings: Holding[], cdiAnnual: number, n: number) {
  const hs = holdings.map((h) => ({ ...h }));
  for (let i = 0; i < n; i++) for (const h of hs) h.value += monthlyYield(cdiAnnual, h.inv, h.value);
  return hs.reduce((s, h) => s + h.value, 0);
}

/**
 * Lines that explain a month's surplus, one per item type
 * (used by the projection breakdown). `excludeIncome` removes incomes counted elsewhere.
 */
export function surplusLines(txs: Transaction[], ym: string, label: string, excludeIncome = 0) {
  const s = monthSummary(txs, ym);
  const lines: { label: string; value: number; hint?: string }[] = [];
  const income = s.income - excludeIncome;
  if (income) lines.push({ label: `Ganhos de ${label}`, value: income });
  if (s.fixedExpense) lines.push({ label: `Custos fixos de ${label}`, value: -s.fixedExpense });
  if (s.oneTimeExpense) {
    const names = s.items.filter((t) => t.kind === 'expense' && t.recurrence === 'one_time').map((t) => t.description);
    lines.push({ label: `Custos pontuais de ${label}`, value: -s.oneTimeExpense, hint: names.join(', ') });
  }
  return { lines, net: income - s.expense };
}
