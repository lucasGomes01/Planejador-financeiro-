import { useState } from 'react';
import { useData } from '../context/DataContext';
import { dateBR, money, parseDateBR, parseMoney, todayISO } from '../lib/format';
import { typeColor } from '../lib/types';
import { Button, Chip, Empty, ErrorText, Field, Muted, Row } from './ui';

/** Update the balance of one place (creates a snapshot for the chosen day). */
export function BalanceForm({ investmentId, onDone }: { investmentId?: string; onDone: () => void }) {
  const { investments, balances, setBalance } = useData();
  const [id, setId] = useState(investmentId ?? investments[0]?.id);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dateBR(todayISO()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!investments.length) return <Empty>Cadastre primeiro um investimento.</Empty>;

  async function submit() {
    setError('');
    const v = parseMoney(amount);
    const d = parseDateBR(date);
    if (!id) return setError('Escolha onde está o dinheiro.');
    if (!(v >= 0)) return setError('Informe o saldo.');
    if (!d) return setError('Data inválida (use DD/MM/AAAA).');
    if (d > todayISO()) return setError('A data não pode estar no futuro.');
    setSaving(true);
    try { await setBalance(id, v, d); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  return (
    <>
      {!investmentId && (
        <>
          <Muted style={{ marginBottom: 6 }}>Onde?</Muted>
          <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {investments.map((i) => (
              <Chip key={i.id} label={i.name} color={typeColor(i.type)} active={id === i.id} onPress={() => setId(i.id)} />
            ))}
          </Row>
        </>
      )}
      {id ? <Muted style={{ marginBottom: 8 }}>Saldo registrado: {money(balances.get(id) ?? 0)}</Muted> : null}
      <Field label="Novo saldo (R$)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Data" value={date} onChangeText={setDate} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" />
      <ErrorText>{error}</ErrorText>
      <Button title="Salvar saldo" onPress={submit} loading={saving} />
    </>
  );
}
