import { useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { passwordProblems } from '../lib/password';
import { useAuth } from '../context/AuthContext';
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from './ui';

/** Shown after the user opens a "reset password" e-mail link. */
export function ResetPassword() {
  const { finishRecovery, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    const probs = passwordProblems(pw);
    if (probs.length) return setError(`A nova senha precisa de: ${probs.join(', ')}.`);
    if (pw !== pw2) return setError('As senhas não conferem.');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (err) return setError(err.message);
    finishRecovery();
  }

  return (
    <Screen>
      <View style={{ height: 48 }} />
      <Title>Definir nova senha</Title>
      <Card>
        <Muted style={{ marginBottom: 12 }}>Mín. 10 caracteres com maiúscula, minúscula, número e símbolo.</Muted>
        <Field label="Nova senha" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" />
        <Field label="Confirmar nova senha" value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" />
        <ErrorText>{error}</ErrorText>
        <Button title="Salvar nova senha" onPress={submit} loading={loading} />
        <Button title="Cancelar e sair" variant="ghost" onPress={signOut} />
      </Card>
    </Screen>
  );
}
