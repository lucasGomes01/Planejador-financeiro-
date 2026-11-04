import { Alert, Platform } from 'react-native';

export function confirm(message: string, action = 'Excluir'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((res) => Alert.alert('Confirmar', message, [
    { text: 'Cancelar', style: 'cancel', onPress: () => res(false) },
    { text: action, style: 'destructive', onPress: () => res(true) },
  ]));
}
