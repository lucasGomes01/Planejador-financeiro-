import { router, useLocalSearchParams } from 'expo-router';
import { confirm } from '../../lib/confirm';
import { useData } from '../../context/DataContext';
import { TransactionForm } from '../../components/TransactionForm';
import { Button, Card, Empty, Screen } from '../../components/ui';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction, deleteTransaction } = useData();
  const t = transactions.find((x) => x.id === id);
  if (!t) return <Screen><Empty>Lançamento não encontrado.</Empty></Screen>;
  return (
    <Screen>
      <Card>
        <TransactionForm initial={t} onSubmit={async (v) => { await updateTransaction(t.id, v); router.back(); }} />
      </Card>
      <Button title="Excluir lançamento" variant="danger" onPress={async () => {
        if (await confirm(`Excluir "${t.description}"?`)) { await deleteTransaction(t.id); router.back(); }
      }} />
    </Screen>
  );
}
