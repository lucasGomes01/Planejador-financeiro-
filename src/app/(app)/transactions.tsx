import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useData } from '../../context/DataContext';
import { addMonths, currentYM, monthSummary } from '../../lib/finance';
import { dateBR, money, monthBR, monthLong } from '../../lib/format';
import type { Transaction } from '../../lib/types';
import { Card, Empty, Row, Segmented, Subtitle } from '../../components/ui';
import { Fab } from '../../components/Fab';
import { colors } from '../../components/theme';

type Filter = 'all' | 'income' | 'expense';

export default function Transactions() {
  const { transactions } = useData();
  const [ym, setYm] = useState(currentYM());
  const [filter, setFilter] = useState<Filter>('all');
  const sum = monthSummary(transactions, ym);
  const items = sum.items.filter((t) => filter === 'all' || t.kind === filter);
  const fixed = items.filter((t) => t.recurrence === 'fixed');
  const oneTime = items.filter((t) => t.recurrence === 'one_time');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <Pressable onPress={() => setYm(addMonths(ym, -1))} hitSlop={12}><Ionicons name="chevron-back" size={26} color={colors.primary} /></Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700', textTransform: 'capitalize' }}>{monthLong(ym)}</Text>
            <Pressable onPress={() => setYm(addMonths(ym, 1))} hitSlop={12}><Ionicons name="chevron-forward" size={26} color={colors.primary} /></Pressable>
          </Row>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stat label="Ganhos" value={sum.income} color={colors.income} />
              <Stat label="Custos" value={sum.expense} color={colors.expense} />
              <Stat label="Sobra" value={sum.net} color={sum.net >= 0 ? colors.income : colors.expense} />
            </Row>
          </Card>
          <Segmented<Filter> value={filter} onChange={setFilter}
            options={[{ value: 'all', label: 'Todos' }, { value: 'income', label: 'Ganhos' }, { value: 'expense', label: 'Custos' }]} />
          <Card>
            <Subtitle>Fixos / mensais</Subtitle>
            {fixed.length ? fixed.map((t) => <Item key={t.id} t={t} />) : <Empty>Nenhum lançamento fixo neste mês.</Empty>}
          </Card>
          <Card>
            <Subtitle>Pontuais</Subtitle>
            {oneTime.length ? oneTime.map((t) => <Item key={t.id} t={t} />) : <Empty>Nenhum lançamento pontual neste mês.</Empty>}
          </Card>
        </View>
      </ScrollView>
      <Fab params={{ month: ym }} />
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color, fontWeight: '800', fontSize: 15 }}>{money(value)}</Text>
    </View>
  );
}

function Item({ t }: { t: Transaction }) {
  const { goals } = useData();
  const goal = t.goal_id ? goals.find((g) => g.id === t.goal_id)?.name : null;
  const sub = t.recurrence === 'fixed'
    ? `desde ${monthBR(t.date)}${t.end_date ? ` até ${monthBR(t.end_date)}` : ''}`
    : dateBR(t.date);
  return (
    <Pressable onPress={() => router.push(`/transaction/${t.id}`)}
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{t.description}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{[t.category, sub, goal ? `→ ${goal}` : null].filter(Boolean).join(' · ')}</Text>
      </View>
      <Text style={{ fontWeight: '700', color: t.kind === 'income' ? colors.income : colors.expense }}>
        {t.kind === 'income' ? '+' : '−'} {money(t.amount)}
      </Text>
    </Pressable>
  );
}
