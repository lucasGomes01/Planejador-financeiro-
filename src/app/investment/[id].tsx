import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { confirm } from '../../lib/confirm';
import { dateBR, money } from '../../lib/format';
import { InvestmentForm } from '../../components/InvestmentForm';
import { BalanceForm } from '../../components/BalanceForm';
import { Button, Card, Empty, Row, Screen, Segmented, Subtitle } from '../../components/ui';
import { colors } from '../../components/theme';

export default function InvestmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { investments, snapshots, updateInvestment, deleteInvestment, deleteSnapshot } = useData();
  const [tab, setTab] = useState<'balance' | 'edit'>('balance');
  const inv = investments.find((x) => x.id === id);
  if (!inv) return <Screen><Empty>Investimento não encontrado.</Empty></Screen>;
  const history = snapshots.filter((s) => s.investment_id === inv.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 12, color: colors.text }}>{inv.name}</Text>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'balance', label: 'Saldo' }, { value: 'edit', label: 'Dados' }]} />
      {tab === 'balance' ? (
        <>
          <Card><BalanceForm investmentId={inv.id} onDone={() => {}} /></Card>
          <Card>
            <Subtitle>Histórico</Subtitle>
            {history.length === 0 && <Empty>Sem registros.</Empty>}
            {history.map((s) => (
              <Row key={s.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ color: colors.muted }}>{dateBR(s.date)}</Text>
                <Row>
                  <Text style={{ fontWeight: '600' }}>{money(s.amount)}</Text>
                  <Pressable accessibilityLabel="Excluir registro" hitSlop={10}
                    onPress={async () => { if (await confirm(`Excluir o registro de ${dateBR(s.date)}?`)) deleteSnapshot(s.id); }}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </Row>
              </Row>
            ))}
          </Card>
        </>
      ) : (
        <>
          <Card>
            <InvestmentForm initial={inv} onSubmit={async (v) => { await updateInvestment(inv.id, v); setTab('balance'); }} />
          </Card>
          <View style={{ height: 4 }} />
          <Button title="Excluir investimento" variant="danger" onPress={async () => {
            if (await confirm(`Excluir "${inv.name}" e todo o histórico?`)) { await deleteInvestment(inv.id); router.back(); }
          }} />
        </>
      )}
    </Screen>
  );
}
