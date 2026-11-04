import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useData } from '../context/DataContext';
import { currentYM } from '../lib/finance';
import { todayISO } from '../lib/format';
import { TransactionForm } from '../components/TransactionForm';
import { InvestmentForm } from '../components/InvestmentForm';
import { BalanceForm } from '../components/BalanceForm';
import { Card, Screen, Segmented } from '../components/ui';

type Mode = 'tx' | 'balance' | 'investment';

/** Quick entry, reachable from the "+" button on every tab. */
export default function QuickAdd() {
  const params = useLocalSearchParams<{ mode?: Mode; month?: string; investmentId?: string }>();
  const { addTransaction, addInvestment } = useData();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'tx');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null;
  const initialDate = month && month !== currentYM() ? `${month}-01` : todayISO();

  return (
    <Screen>
      <Segmented<Mode> value={mode} onChange={setMode} options={[
        { value: 'tx', label: 'Ganho / Custo' },
        { value: 'balance', label: 'Atualizar saldo' },
        { value: 'investment', label: 'Novo local' },
      ]} />
      <Card>
        {mode === 'tx' && (
          <TransactionForm initial={{ date: initialDate }} submitLabel="Adicionar"
            onSubmit={async (t) => { await addTransaction(t); close(); }} />
        )}
        {mode === 'balance' && <BalanceForm investmentId={params.investmentId} onDone={close} />}
        {mode === 'investment' && (
          <InvestmentForm withBalance submitLabel="Adicionar"
            onSubmit={async (i, bal) => { await addInvestment(i, bal); close(); }} />
        )}
      </Card>
    </Screen>
  );
}
