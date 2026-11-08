import { useState } from 'react';
import type { Goal } from '../lib/types';
import { monthBR, moneyInput, parseMoney, parseMonthBR } from '../lib/format';
import { Text } from 'react-native';
import { Button, ErrorText, Field, Segmented } from './ui';
import { colors } from './theme';

export type GoalInput = Omit<Goal, 'id'>;

export function GoalForm({ initial, onSubmit, submitLabel = 'Salvar' }: {
  initial?: Partial<GoalInput>; onSubmit: (g: GoalInput) => Promise<void>; submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? 'Carro');
  const [target, setTarget] = useState(initial?.target_amount != null ? moneyInput(initial.target_amount) : '');
  const [monthly, setMonthly] = useState(initial?.monthly_contribution ? moneyInput(initial.monthly_contribution) : '');
  const [mode, setMode] = useState<'fixed' | 'surplus'>(initial?.contribution_mode ?? 'fixed');
  const [pct, setPct] = useState(String(initial?.surplus_percent ?? 100).replace('.', ','));
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
    if (mode === 'fixed' && !(m >= 0)) return setError('Aporte mensal inválido.');
    const p = pct.trim() ? parseMoney(pct) : 100;
    if (mode === 'surplus' && !(p >= 0 && p <= 100)) return setError('Percentual da sobra deve ser de 0 a 100.');
    if (date.trim() && !d) return setError('Data inválida (use MM/AAAA).');
    setSaving(true);
    try { await onSubmit({ name: name.trim().slice(0, 80), target_amount: t, monthly_contribution: mode === 'fixed' ? m : 0,
        contribution_mode: mode, surplus_percent: mode === 'surplus' ? p : 100, target_date: d }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
      <Field label="Valor da meta (R$)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="Ex.: 80.000,00" />
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Quanto entra na meta por mês</Text>
      <Segmented<'fixed' | 'surplus'> value={mode} onChange={setMode}
        options={[{ value: 'fixed', label: 'Valor fixo' }, { value: 'surplus', label: 'Sobra do mês' }]} />
      {mode === 'fixed' ? (
        <Field label="Aporte mensal planejado (R$)" value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" placeholder="0,00"
          hint="Valor fixo por mês. Não considera seus ganhos e custos lançados." />
      ) : (
        <Field label="% da sobra que vai para a meta" value={pct} onChangeText={setPct} keyboardType="decimal-pad"
          hint="Sobra = ganhos − custos fixos − custos pontuais de cada mês. Mês com sobra negativa tira da meta." />
      )}
      <Field label="Quero atingir em (opcional)" value={date} onChangeText={setDate} placeholder="MM/AAAA" keyboardType="numbers-and-punctuation" />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </>
  );
}
