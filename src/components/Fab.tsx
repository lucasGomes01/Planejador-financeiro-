import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from './theme';

/** Floating "+" for quick entry from any tab. */
export function Fab({ params }: { params?: Record<string, string> }) {
  return (
    <Pressable
      accessibilityLabel="Cadastro rápido"
      onPress={() => router.push({ pathname: '/add', params })}
      style={({ pressed }) => [s.fab, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name="add" size={30} color="#fff" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
