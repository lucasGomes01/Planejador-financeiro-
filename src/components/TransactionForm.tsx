import { useState } from 'react';
import { Text } from 'react-native';
import type { Kind, Recurrence, Transaction } from '../lib/types';
import { dateBR, monthBR, moneyInput, parseDateBR, parseMoney, parseMonthBR, todayISO } from '../lib/format';
import { Button, Chip, ErrorText, Field, Muted, Row, Segmented } from './ui';
import { useData } from '../context/DataContext';
import { colors } from './theme';

export type TxInput = Omit<Transaction, 'id'>;

export function TransactionForm({
  initial, onSubmit, submitLabel = 'Salvar',
}: { initial?: Partial<TxInput>; onSubmit: (t: TxInput) => Promise<void>; submitLabel?: string }) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'expense');
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? 'one_time');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [amount, setAmount] = useState(initial?.amount != null ? moneyInput(initial.amount) : '');
  const d0 = initial?.date ?? todayISO();
  const [date, setDate] = useState(dateBR(d0));
  const [start, setStart] = useState(monthBR(d0));
  const [end, setEnd] = useState(initial?.end_date ? monthBR(initial.end_date) : '');
  const { goals } = useData();
  const [goalId, setGoalId] = useState<string | null>(initial?.goal_id ?? null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError('');
    const value = parseMoney(amount);
    if (!description.trim()) return setError('Informe uma descrição.');
    if (!(value > 0)) return setError('Informe um valor maior que zero.');
    let d: string | null; let e: string | null = null;
    if (recurrence === 'one_time') {
      d = parseDateBR(date);
      if (!d) return setError('Data inválida (use DD/MM/AAAA).');
    } else {
      d = parseMonthBR(start);
      if (!d) return setError('Mês de início inválido (use MM/AAAA).');
      if (end.trim()) {
        e = parseMonthBR(end);
        if (!e) return setError('Mês final inválido (use MM/AAAA).');
        if (e < d) return setError('O mês final deve ser depois do início.');
      }
    }
    setSaving(true);
    try {
      await onSubmit({
        kind, recurrence, description: description.trim().slice(0, 120),
        category: category.trim() ? category.trim().slice(0, 60) : null, amount: value, date: d, end_date: e,
        goal_id: kind === 'income' && recurrence === 'one_time' ? goalId : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Segmented<Kind> value={kind} onChange={setKind}
        options={[{ value: 'expense', label: 'Custo' }, { value: 'income', label: 'Ganho' }]} />
      <Segmented<Recurrence> value={recurrence} onChange={setRecurrence}
        options={[{ value: 'one_time', label: 'Pontual' }, { value: 'fixed', label: kind === 'income' ? 'Mensal (previsão)' : 'Fixo mensal' }]} />
      <Field label="Descrição" value={description} onChangeText={setDescription} maxLength={120}
        placeholder={kind === 'income' ? 'Ex.: Salário, Freela' : 'Ex.: Aluguel, Mercado'} />
      <Field label="Valor (R$)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
      {recurrence === 'one_time' ? (
        <Field label="Data" value={date} onChangeText={setDate} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" />
      ) : (
        <>
          <Field label="A partir de" value={start} onChangeText={setStart} placeholder="MM/AAAA" keyboardType="numbers-and-punctuation" />
          <Field label="Até (opcional)" value={end} onChangeText={setEnd} placeholder="MM/AAAA — vazio = sem fim" keyboardType="numbers-and-punctuation" />
        </>
      )}
      {kind === 'income' && recurrence === 'one_time' && goals.length > 0 && (
        <>
          <Muted style={{ marginBottom: 6 }}>Contar para a meta?</Muted>
          <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip label="Não" active={goalId == null} onPress={() => setGoalId(null)} color={colors.muted} />
            {goals.map((g) => <Chip key={g.id} label={g.name} active={goalId === g.id} onPress={() => setGoalId(g.id)} />)}
          </Row>
        </>
      )}
      <Field label="Categoria (opcional)" value={category} onChangeText={setCategory} maxLength={60} />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} />
      <Text style={{ color: kind === 'income' ? colors.income : colors.expense, textAlign: 'center', marginTop: 8, fontSize: 12 }}>
        {kind === 'income' ? 'Entrada' : 'Saída'} · {recurrence === 'fixed' ? 'repete todo mês' : 'acontece uma vez'}
      </Text>
    </>
  );
}
