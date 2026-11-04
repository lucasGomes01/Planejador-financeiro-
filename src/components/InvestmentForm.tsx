import { useState } from 'react';
import { useData } from '../context/DataContext';
import { INVESTMENT_TYPES, type Investment, type InvestmentType } from '../lib/types';
import { moneyInput, parseMoney } from '../lib/format';
import { Button, Chip, ErrorText, Field, Muted, Row } from './ui';
import { colors } from './theme';

export type InvInput = Omit<Investment, 'id'>;

export function InvestmentForm({
  initial, onSubmit, withBalance, submitLabel = 'Salvar',
}: {
  initial?: Partial<InvInput>;
  onSubmit: (i: InvInput, balance?: number) => Promise<void>;
  withBalance?: boolean;
  submitLabel?: string;
}) {
  const { goals } = useData();
  const [name, setName] = useState(initial?.name ?? '');
  const [institution, setInstitution] = useState(initial?.institution ?? '');
  const [type, setType] = useState<InvestmentType>(initial?.type ?? 'fixed_income');
  const [cdi, setCdi] = useState(initial?.cdi_percent != null ? String(initial.cdi_percent).replace('.', ',') : '');
  const [limit, setLimit] = useState(initial?.cdi_limit != null ? moneyInput(initial.cdi_limit) : '');
  const [above, setAbove] = useState(String(initial?.cdi_percent_above ?? 100).replace('.', ','));
  const [goalId, setGoalId] = useState<string | null>(initial?.goal_id ?? null);
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError('');
    if (!name.trim()) return setError('Informe um nome.');
    let cdiPercent: number | null = null;
    if (cdi.trim()) {
      cdiPercent = parseMoney(cdi);
      if (!(cdiPercent >= 0 && cdiPercent <= 1000)) return setError('% do CDI inválido.');
    }
    let cdiLimit: number | null = null;
    let cdiAbove: number | null = 100;
    if (cdiPercent != null && limit.trim()) {
      cdiLimit = parseMoney(limit);
      if (!(cdiLimit > 0)) return setError('Limite inválido.');
      cdiAbove = above.trim() ? parseMoney(above) : 100;
      if (!(cdiAbove >= 0 && cdiAbove <= 1000)) return setError('% do CDI acima do limite inválido.');
    }
    let bal: number | undefined;
    if (withBalance && balance.trim()) {
      bal = parseMoney(balance);
      if (!(bal >= 0)) return setError('Saldo inválido.');
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim().slice(0, 80), institution: institution.trim() ? institution.trim().slice(0, 80) : null,
        type, cdi_percent: cdiPercent, cdi_limit: cdiLimit, cdi_percent_above: cdiAbove, goal_id: goalId,
      }, bal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Muted style={{ marginBottom: 6 }}>Tipo</Muted>
      <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {INVESTMENT_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} color={t.color} active={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </Row>
      <Field label="Nome" value={name} onChangeText={setName} maxLength={80} placeholder="Ex.: CDB Banco X, Caixinha Nubank, ITSA4" />
      <Field label="Instituição (opcional)" value={institution} onChangeText={setInstitution} maxLength={80} />
      <Field label="% do CDI (opcional)" value={cdi} onChangeText={setCdi} keyboardType="decimal-pad" placeholder="Ex.: 105"
        hint="Usado para estimar o rendimento. Deixe vazio para ações e outros." />
      {cdi.trim() ? (
        <>
          <Field label="Limite desse rendimento (R$, opcional)" value={limit} onChangeText={setLimit} keyboardType="decimal-pad"
            placeholder="Ex.: 10.000,00" hint="Ex.: caixinha que paga 120% do CDI só até R$ 10 mil. Vazio = sem limite." />
          {limit.trim() ? (
            <Field label="% do CDI acima do limite" value={above} onChangeText={setAbove} keyboardType="decimal-pad"
              hint="O que passar do limite rende este percentual (ex.: 100, ou 0 se não render)." />
          ) : null}
        </>
      ) : null}
      {withBalance ? (
        <Field label="Saldo atual (R$)" value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0,00" />
      ) : null}
      {goals.length > 0 && (
        <>
          <Muted style={{ marginBottom: 6 }}>Reservado para a meta</Muted>
          <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip label="Nenhuma" active={goalId == null} onPress={() => setGoalId(null)} color={colors.muted} />
            {goals.map((g) => <Chip key={g.id} label={g.name} active={goalId === g.id} onPress={() => setGoalId(g.id)} />)}
          </Row>
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </>
  );
}
