import { useState } from 'react';
import type { Goal } from '../lib/types';
import { monthBR, moneyInput, parseMoney, parseMonthBR } from '../lib/format';
import { Button, ErrorText, Field } from './ui';

export type GoalInput = Omit<Goal, 'id'>;

export function GoalForm({ initial, onSubmit, submitLabel = 'Salvar' }: {
  initial?: Partial<GoalInput>; onSubmit: (g: GoalInput) => Promise<void>; submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? 'Carro');
  const [target, setTarget] = useState(initial?.target_amount != null ? moneyInput(initial.target_amount) : '');
  const [monthly, setMonthly] = useState(initial?.monthly_contribution ? moneyInput(initial.monthly_contribution) : '');
  const [date, setDate] = useState(initial?.target_date ? monthBR(initial.target_date) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError('');
    const t = parseMoney(target);
    const m = monthly.trim() ? parseMoney(monthly) : 0;
    const d = date.trim() ? parseMonthBR(date) : null;
    if (!name.trim()) return setError('Informe o nome da meta.');
    if (!(t > 0)) return setError('Informe o valor da meta.');
    if (!(m >= 0)) return setError('Aporte mensal inválido.');
    if (date.trim() && !d) return setError('Data inválida (use MM/AAAA).');
    setSaving(true);
    try { await onSubmit({ name: name.trim().slice(0, 80), target_amount: t, monthly_contribution: m, target_date: d }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
      <Field label="Valor da meta (R$)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="Ex.: 80.000,00" />
      <Field label="Aporte mensal planejado (R$)" value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Quero atingir em (opcional)" value={date} onChangeText={setDate} placeholder="MM/AAAA" keyboardType="numbers-and-punctuation" />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </>
  );
}
