import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../context/DataContext';
import { goalStatus } from '../../lib/goals';
import { money, monthLong } from '../../lib/format';
import { GoalForm } from '../../components/GoalForm';
import { Card, Muted, Subtitle } from '../../components/ui';
import { Progress } from '../../components/Progress';
import { colors } from '../../components/theme';

export default function Goals() {
  const { goals, investments, balances, settings, addGoal } = useData();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
          {goals.map((g) => {
            const st = goalStatus(g, investments, balances, settings.cdi_annual_rate);
            return (
              <Pressable key={g.id} onPress={() => router.push(`/goal/${g.id}`)}>
                <Card>
                  <Subtitle>{g.name}</Subtitle>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
                    {money(st.saved)} <Text style={{ fontSize: 14, color: colors.muted, fontWeight: '500' }}>de {money(g.target_amount)}</Text>
                  </Text>
                  <Progress value={st.progress} />
                  <Muted>
                    {st.parts.length} local(is) · rende ~{money(st.monthlyYield)}/mês
                    {st.reachYM ? ` · previsão: ${monthLong(st.reachYM)}` : ''}
                  </Muted>
                </Card>
              </Pressable>
            );
          })}
          <Card>
            <Subtitle>{goals.length ? 'Nova meta' : 'Crie sua meta (ex.: carro)'}</Subtitle>
            <GoalForm key={goals.length} submitLabel="Criar meta"
              onSubmit={async (g) => { const id = await addGoal(g); router.push(`/goal/${id}`); }} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
