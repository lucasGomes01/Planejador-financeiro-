import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors } from '../../components/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} color={color as string} size={size} />
);

export default function AppTabs() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTintColor: colors.text }}>
      <Tabs.Screen name="index" options={{ title: 'Painel', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="transactions" options={{ title: 'Lançamentos', tabBarIcon: icon('swap-vertical') }} />
      <Tabs.Screen name="investments" options={{ title: 'Patrimônio', tabBarIcon: icon('wallet') }} />
      <Tabs.Screen name="goals" options={{ title: 'Metas', tabBarIcon: icon('car-sport') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
