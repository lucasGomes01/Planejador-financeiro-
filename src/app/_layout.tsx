import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { AppLock } from '../components/AppLock';
import { ResetPassword } from '../components/ResetPassword';
import { colors } from '../components/theme';

function RootNavigator() {
  const { session, loading, needsMfa, recovering } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const signedIn = !!session && !needsMfa;
  if (signedIn && recovering) return <ResetPassword />;
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && needsMfa}>
        <Stack.Screen name="mfa" options={{ title: 'Verificação em duas etapas' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Cadastro rápido' }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Editar lançamento' }} />
        <Stack.Screen name="investment/[id]" options={{ title: 'Investimento' }} />
        <Stack.Screen name="goal/[id]" options={{ title: 'Meta' }} />
        <Stack.Screen name="security" options={{ title: 'Segurança' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <AppLock>
            <RootNavigator />
          </AppLock>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
