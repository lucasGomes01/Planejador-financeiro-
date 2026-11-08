import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useData } from '../../context/DataContext';
import { confirm } from '../../lib/confirm';
import { goalStatus } from '../../lib/goals';
import { balanceSeries } from '../../lib/finance';
import { money, monthLong } from '../../lib/format';
import { rateLabel, typeColor } from '../../lib/types';
import { dateBR } from '../../lib/format';
import { GoalForm } from '../../components/GoalForm';
import { LineChart } from '../../components/LineChart';
import { ProjectionDetail } from '../../components/ProjectionDetail';
import { Progress } from '../../components/Progress';
import { Button, Card, Chip, Empty, Muted, Row, Screen, Segmented, Subtitle } from '../../components/ui';
import { colors } from '../../components/theme';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, investments, balances, settings, transactions, snapshots, updateGoal, deleteGoal, updateInvestment } = useData();
  const [tab, setTab] = useState<'overview' | 'edit'>('overview');
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const goal = goals.find((g) => g.id === id);
  const st = useMemo(() => goal && goalStatus(goal, investments, balances, settings.cdi_annual_rate, transactions, snapshots),
    [goal, investments, balances, settings, transactions, snapshots]);
  if (!goal || !st) return <Screen><Empty>Meta não encontrada.</Empty></Screen>;

  const path = balanceSeries({
    snapshots, investments, selected: st.linkedIds, monthsBack: 0,
    monthsAhead: Math.min(60, Math.max(6, st.months ?? 60)), cdiAnnual: settings.cdi_annual_rate,
    contribution: st.contribution, startExtra: st.pending,
  });

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 12, color: colors.text }}>{goal.name}</Text>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Acompanhar' }, { value: 'edit', label: 'Editar' }]} />
      {tab === 'overview' ? (
        <>
          <Card>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{money(st.saved)}</Text>
            <Muted>de {money(goal.target_amount)} · faltam {money(Math.max(0, goal.target_amount - st.saved))}</Muted>
            <Progress value={st.progress} />
            {st.pending > 0 ? (
              <Muted>Inclui {money(st.pending)} de ganhos pontuais ainda não lançados em um saldo.</Muted>
            ) : null}
            {st.future > 0 ? (
              <Muted>+ {money(st.future)} em ganhos pontuais futuros entram na previsão.</Muted>
            ) : null}
            <Muted>Rendimento estimado: {money(st.monthlyYield)}/mês</Muted>
            <Muted>
              {st.surplusMode
                ? `Entra por mês: ${String(goal.surplus_percent).replace('.', ',')}% da sobra (ganhos − custos fixos e pontuais). Próximo mês: ${money(st.nextBase)} · média 12 meses: ${money(st.avgBase)}`
                : `Entra por mês: ${money(goal.monthly_contribution)} (valor fixo — não considera ganhos e custos lançados)`}
            </Muted>
            <Muted style={{ marginTop: 4 }}>
              {st.months === 0 ? 'Meta atingida! 🎉'
                : st.reachYM ? `Com esse ritmo você chega lá em ${monthLong(st.reachYM)} (${st.months} meses).`
                : 'Defina um aporte mensal ou vincule investimentos para ver a previsão.'}
            </Muted>
            {st.neededMonthly != null && goal.target_date ? (
              <Muted style={{ marginTop: 4 }}>
                Para atingir em {monthLong(goal.target_date.slice(0, 7))}: precisa entrar {money(st.neededMonthly)}/mês.
              </Muted>
            ) : null}
          </Card>

          {path.length > 1 && (
            <Card>
              <Subtitle>Projeção</Subtitle>
              <LineChart data={path} onSelect={setSelIdx} />
            </Card>
          )}

          {st.pendingItems.length + st.futureItems.length > 0 && (
            <Card>
              <Subtitle>Ganhos pontuais destinados</Subtitle>
              {[...st.pendingItems, ...st.futureItems].map((t) => (
                <Pressable key={t.id} onPress={() => router.push(`/transaction/${t.id}`)}>
                  <Row style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>{t.description}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {dateBR(t.date)} · {st.futureItems.includes(t) ? 'previsto' : 'a depositar'}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: colors.income }}>+ {money(t.amount)}</Text>
                  </Row>
                </Pressable>
              ))}
              <Muted style={{ marginTop: 6 }}>Ao atualizar o saldo de um local da meta, os ganhos já recebidos passam a contar pelo saldo.</Muted>
            </Card>
          )}

          <Card>
            <Subtitle>Onde está o dinheiro da meta</Subtitle>
            {st.parts.length === 0 && <Empty>Nenhum local vinculado. Toque nos locais abaixo para vincular.</Empty>}
            {st.parts.map((p) => (
              <Pressable key={p.inv.id} onPress={() => router.push(`/investment/${p.inv.id}`)}>
                <Row style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>{p.inv.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {rateLabel(p.inv) ?? 'sem CDI'}{' · '}~{money(p.yield)}/mês
                    </Text>
                  </View>
                  <Text style={{ fontWeight: '700' }}>{money(p.value)}</Text>
                </Row>
              </Pressable>
            ))}
            <View style={{ height: 8 }} />
            <Muted style={{ marginBottom: 6 }}>Vincular / desvincular locais:</Muted>
            <Row style={{ flexWrap: 'wrap' }}>
              {investments.map((i) => (
                <Chip key={i.id} label={i.name} color={typeColor(i.type)} active={i.goal_id === goal.id}
                  onPress={() => updateInvestment(i.id, { goal_id: i.goal_id === goal.id ? null : goal.id })} />
              ))}
            </Row>
            {investments.length === 0 && <Muted>Cadastre locais em “Patrimônio”.</Muted>}
            <View style={{ height: 12 }} />
            <Row>
              <View style={{ flex: 1 }}>
                <Button small variant="secondary" title="Atualizar saldo" onPress={() => router.push({ pathname: '/add', params: { mode: 'balance' } })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button small title="Novo local" onPress={() => router.push({ pathname: '/add', params: { mode: 'investment' } })} />
              </View>
            </Row>
          </Card>

          <ProjectionDetail data={path} index={selIdx} monthDetail={st.detailAt} contribLabel="Aportes da meta"
            cdiLabel={`${String(settings.cdi_annual_rate).replace('.', ',')}%`} />
        </>
      ) : (
        <>
          <Card>
            <GoalForm initial={goal} onSubmit={async (g) => { await updateGoal(goal.id, g); setTab('overview'); }} />
          </Card>
          <Button title="Excluir meta" variant="danger" onPress={async () => {
            if (await confirm(`Excluir a meta "${goal.name}"? Os investimentos não serão apagados.`)) { await deleteGoal(goal.id); router.back(); }
          }} />
        </>
      )}
    </Screen>
  );
}
