export type Kind = 'income' | 'expense';
export type Recurrence = 'fixed' | 'one_time';
export type InvestmentType = 'cash' | 'fixed_income' | 'stocks' | 'other';

export interface Transaction {
  id: string;
  kind: Kind;
  recurrence: Recurrence;
  description: string;
  category: string | null;
  amount: number;
  date: string; // YYYY-MM-DD
  end_date: string | null;
  /** one-time income earmarked for a goal */
  goal_id: string | null;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  monthly_contribution: number;
  /** 'fixed' = monthly_contribution; 'surplus' = month's income − expenses × surplus_percent */
  contribution_mode: 'fixed' | 'surplus';
  surplus_percent: number;
}

export interface Investment {
  id: string;
  name: string;
  institution: string | null;
  type: InvestmentType;
  cdi_percent: number | null;
  /** balance up to which cdi_percent applies (null = no limit) */
  cdi_limit: number | null;
  /** % of CDI paid on the part above cdi_limit */
  cdi_percent_above: number | null;
  goal_id: string | null;
}

export interface Snapshot {
  id: string;
  investment_id: string;
  date: string;
  amount: number;
}

export interface Settings {
  cdi_annual_rate: number;
}

export const INVESTMENT_TYPES: { value: InvestmentType; label: string; color: string }[] = [
  { value: 'cash', label: 'Conta / Caixa', color: '#0EA5E9' },
  { value: 'fixed_income', label: 'Renda fixa', color: '#16A34A' },
  { value: 'stocks', label: 'Ações', color: '#9333EA' },
  { value: 'other', label: 'Outros', color: '#F59E0B' },
];

export const typeLabel = (t: InvestmentType) => INVESTMENT_TYPES.find((x) => x.value === t)?.label ?? t;
export const typeColor = (t: InvestmentType) => INVESTMENT_TYPES.find((x) => x.value === t)?.color ?? '#64748B';

const pct = (n: number) => `${String(n).replace('.', ',')}%`;
const brlShort = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** "105% CDI" or "120% CDI até R$ 10.000, depois 100%" (null when not CDI-indexed). */
export function rateLabel(i: Pick<Investment, 'cdi_percent' | 'cdi_limit' | 'cdi_percent_above'>): string | null {
  if (i.cdi_percent == null) return null;
  if (i.cdi_limit == null) return `${pct(i.cdi_percent)} CDI`;
  return `${pct(i.cdi_percent)} CDI até R$ ${brlShort(i.cdi_limit)}, depois ${pct(i.cdi_percent_above ?? 100)}`;
}
