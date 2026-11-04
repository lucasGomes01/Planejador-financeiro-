import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../context/DataContext';
import { monthlyYield } from '../../lib/finance';
import { money } from '../../lib/format';
import { INVESTMENT_TYPES, rateLabel, type Investment } from '../../lib/types';
import { Button, Card, Empty, Muted, Row, Subtitle } from '../../components/ui';
import { Fab } from '../../components/Fab';
import { colors } from '../../components/theme';

export default function Investments() {
  const { investments, balances, settings, goals } = useData();
  const total = investments.reduce((s, i) => s + (balances.get(i.id) ?? 0), 0);
  const totalYield = investments.reduce(
    (s, i) => s + monthlyYield(settings.cdi_annual_rate, i, balances.get(i.id) ?? 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
          <Card>
            <Muted>Total guardado</Muted>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{money(total)}</Text>
            <Muted>Rendimento estimado: {money(totalYield)}/mês (CDI {String(settings.cdi_annual_rate).replace('.', ',')}% a.a.)</Muted>
            <View style={{ height: 12 }} />
            <Row>
              <View style={{ flex: 1 }}><Button small title="Atualizar saldo" variant="secondary" onPress={() => router.push({ pathname: '/add', params: { mode: 'balance' } })} /></View>
              <View style={{ flex: 1 }}><Button small title="Novo local" onPress={() => router.push({ pathname: '/add', params: { mode: 'investment' } })} /></View>
            </Row>
          </Card>
          {investments.length === 0 && <Empty>Nenhum investimento cadastrado. Toque em “Novo local”.</Empty>}
          {INVESTMENT_TYPES.map((t) => {
            const list = investments.filter((i) => i.type === t.value);
            if (!list.length) return null;
            const sub = list.reduce((s, i) => s + (balances.get(i.id) ?? 0), 0);
            return (
              <Card key={t.value}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} /><Subtitle>{t.label}</Subtitle></Row>
                  <Text style={{ fontWeight: '700', marginBottom: 8 }}>{money(sub)}</Text>
                </Row>
                {list.map((i) => <Item key={i.id} i={i} value={balances.get(i.id) ?? 0} goal={goals.find((g) => g.id === i.goal_id)?.name} />)}
              </Card>
            );
          })}
        </View>
      </ScrollView>
      <Fab params={{ mode: 'balance' }} />
    </SafeAreaView>
  );
}

function Item({ i, value, goal }: { i: Investment; value: number; goal?: string }) {
  const details = [i.institution, rateLabel(i), goal ? `Meta: ${goal}` : null]
    .filter(Boolean).join(' · ');
  return (
    <Pressable onPress={() => router.push(`/investment/${i.id}`)}
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{i.name}</Text>
        {details ? <Text style={{ color: colors.muted, fontSize: 12 }}>{details}</Text> : null}
      </View>
      <Text style={{ fontWeight: '700', color: colors.text }}>{money(value)}</Text>
    </Pressable>
  );
}
