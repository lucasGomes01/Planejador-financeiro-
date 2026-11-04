import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../context/DataContext';
import { balanceSeries, currentYM, monthSummary } from '../../lib/finance';
import { money, monthLong } from '../../lib/format';
import { INVESTMENT_TYPES, typeColor, type InvestmentType } from '../../lib/types';
import { LineChart } from '../../components/LineChart';
import { Card, Chip, ErrorText, Muted, Row, Segmented, Subtitle } from '../../components/ui';
import { Fab } from '../../components/Fab';
import { colors } from '../../components/theme';

type Range = '6' | '12' | '24';

export default function Dashboard() {
  const { investments, snapshots, transactions, settings, balances, reload, loading, error } = useData();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [range, setRange] = useState<Range>('12');
  const [projection, setProjection] = useState(true);

  const selected = useMemo(() => new Set(investments.map((i) => i.id).filter((id) => !excluded.has(id))), [investments, excluded]);
  const series = useMemo(() => balanceSeries({
    snapshots, investments, selected, monthsBack: Number(range) - 1, monthsAhead: projection ? 12 : 0,
    cdiAnnual: settings.cdi_annual_rate, transactions, includeNetInProjection: true,
  }), [snapshots, investments, selected, range, projection, settings, transactions]);

  const month = monthSummary(transactions, currentYM());
  const totalAll = investments.reduce((s, i) => s + (balances.get(i.id) ?? 0), 0);

  const toggle = (id: string) => setExcluded((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleType = (t: InvestmentType) => {
    const ids = investments.filter((i) => i.type === t).map((i) => i.id);
    const allOn = ids.every((id) => !excluded.has(id));
    setExcluded((prev) => { const n = new Set(prev); ids.forEach((id) => (allOn ? n.add(id) : n.delete(id))); return n; });
  };
  const byType = INVESTMENT_TYPES.map((t) => ({
    ...t,
    total: investments.filter((i) => i.type === t.value).reduce((s, i) => s + (balances.get(i.id) ?? 0), 0),
    count: investments.filter((i) => i.type === t.value).length,
  })).filter((t) => t.count > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
          <ErrorText>{error}</ErrorText>
          <Card>
            <Subtitle>Valor guardado</Subtitle>
            <LineChart data={series} />
            <Segmented<Range> value={range} onChange={setRange}
              options={[{ value: '6', label: '6 meses' }, { value: '12', label: '1 ano' }, { value: '24', label: '2 anos' }]} />
            <Row style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <Chip label="Projeção 12 meses" active={projection} onPress={() => setProjection(!projection)} color={colors.muted} />
            </Row>
            {investments.length === 0 ? (
              <Muted>Cadastre onde seu dinheiro está em “Patrimônio” para ver o gráfico.</Muted>
            ) : (
              <>
                <Muted style={{ marginBottom: 6 }}>Somar no gráfico:</Muted>
                <Row style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                  {byType.map((t) => (
                    <Chip key={t.value} label={t.label} color={t.color}
                      active={investments.filter((i) => i.type === t.value).every((i) => !excluded.has(i.id))}
                      onPress={() => toggleType(t.value)} />
                  ))}
                </Row>
                <Row style={{ flexWrap: 'wrap' }}>
                  {investments.map((i) => (
                    <Chip key={i.id} label={i.name} color={typeColor(i.type)} active={!excluded.has(i.id)} onPress={() => toggle(i.id)} />
                  ))}
                </Row>
              </>
            )}
            {projection ? (
              <Muted style={{ marginTop: 10 }}>
                Linha tracejada: rendimento pelo CDI ({String(settings.cdi_annual_rate).replace('.', ',')}% a.a.) + saldo mensal previsto.
              </Muted>
            ) : null}
          </Card>

          <Card>
            <Subtitle>Patrimônio total: {money(totalAll)}</Subtitle>
            {byType.map((t) => (
              <Row key={t.value} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} /><Text>{t.label}</Text></Row>
                <Text style={{ fontWeight: '600' }}>{money(t.total)}</Text>
              </Row>
            ))}
          </Card>

          <Card>
            <Subtitle>{monthLong(currentYM())}</Subtitle>
            <Line label="Ganhos fixos (previsão)" value={month.fixedIncome} color={colors.income} />
            <Line label="Ganhos pontuais" value={month.oneTimeIncome} color={colors.income} />
            <Line label="Custos fixos" value={-month.fixedExpense} color={colors.expense} />
            <Line label="Custos pontuais" value={-month.oneTimeExpense} color={colors.expense} />
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
            <Line label="Sobra do mês" value={month.net} color={month.net >= 0 ? colors.income : colors.expense} bold />
          </Card>
        </View>
      </ScrollView>
      <Fab />
    </SafeAreaView>
  );
}

function Line({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ color: colors.text, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={{ color, fontWeight: bold ? '800' : '600' }}>{money(value)}</Text>
    </Row>
  );
}
