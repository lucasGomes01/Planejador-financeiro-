import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSimulation } from '../context/SimulationContext';
import { useData } from '../context/DataContext';
import { addMonths, currentYM, monthSummary } from '../lib/finance';
import { money, monthBR, moneyInput, parseMoney, parseMonthBR } from '../lib/format';
import { Button, Chip, ErrorText, Field, Muted, Row } from './ui';
import { colors } from './theme';

/** Toggle + fields for the "what if I earned X per month" simulation. */
export function SimulationPanel() {
  const { sim, setSim } = useSimulation();
  const { transactions } = useData();
  const current = monthSummary(transactions, currentYM()).fixedIncome;
  const [open, setOpen] = useState(sim != null);
  const [amount, setAmount] = useState(moneyInput(sim?.monthlyIncome ?? current));
  const [start, setStart] = useState(monthBR(`${sim?.startYM ?? addMonths(currentYM(), 1)}-01`));
  const [error, setError] = useState('');

  function apply() {
    setError('');
    const v = parseMoney(amount);
    const d = parseMonthBR(start);
    if (!(v >= 0)) return setError('Informe o ganho mensal simulado.');
    if (!d) return setError('Mês inválido (use MM/AAAA).');
    setSim({ monthlyIncome: v, startYM: d.slice(0, 7) });
  }

  return (
    <View style={{ marginBottom: 8 }}>
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip label={sim ? 'Simulação ligada' : 'Simular ganhos'} active={sim != null || open} color={colors.accent}
          onPress={() => { if (open || sim) { setOpen(false); setSim(null); } else setOpen(true); }} />
      </Row>
      {open && (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: 10, padding: 12, marginTop: 8 }}>
          <Muted style={{ marginBottom: 8 }}>
            Hoje seus ganhos fixos somam {money(current)}/mês. Simule outro valor (não altera seus lançamentos).
          </Muted>
          <Field label="Ganho mensal simulado (R$)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Field label="A partir de" value={start} onChangeText={setStart} placeholder="MM/AAAA" keyboardType="numbers-and-punctuation" />
          <ErrorText>{error}</ErrorText>
          <Row>
            <View style={{ flex: 1 }}><Button small title={sim ? 'Atualizar simulação' : 'Simular'} onPress={apply} /></View>
            {sim ? (
              <View style={{ flex: 1 }}>
                <Button small variant="secondary" title="Desligar" onPress={() => { setSim(null); setOpen(false); }} />
              </View>
            ) : null}
          </Row>
          {sim ? (
            <Text style={{ color: colors.text, fontSize: 12, marginTop: 8 }}>
              Simulando {money(sim.monthlyIncome)}/mês a partir de {monthBR(`${sim.startYM}-01`)}. Custos e ganhos pontuais continuam iguais.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
