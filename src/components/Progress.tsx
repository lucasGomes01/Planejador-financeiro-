import { View } from 'react-native';
import { colors } from './theme';

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginVertical: 8 }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 5 }} />
    </View>
  );
}
