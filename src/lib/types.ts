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
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  monthly_contribution: number;
}

export interface Investment {
  id: string;
  name: string;
  institution: string | null;
  type: InvestmentType;
  cdi_percent: number | null;
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
