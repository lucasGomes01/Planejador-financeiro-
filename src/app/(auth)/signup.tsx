import { useState } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { isEmail, passwordProblems } from '../../lib/password';
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from '../../components/ui';
import { colors } from '../../components/theme';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const problems = passwordProblems(password);

  async function submit() {
    setError('');
    if (!isEmail(email)) return setError('E-mail inválido.');
    if (problems.length) return setError(`A senha precisa de: ${problems.join(', ')}.`);
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (err) return setError(err.message);
    setDone(true);
  }

  return (
    <Screen>
      <View style={{ height: 48 }} />
      <Title>Criar conta</Title>
      {done ? (
        <Card>
          <Text style={{ color: colors.text, marginBottom: 12 }}>
            Conta criada! Enviamos um link de confirmação para {email.trim()}. Confirme e depois entre.
          </Text>
          <Link href="/login" style={{ color: colors.primary, fontWeight: '700' }}>Ir para o login</Link>
        </Card>
      ) : (
        <Card>
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password"
            hint={password && problems.length ? `Falta: ${problems.join(', ')}` : 'Mín. 10 caracteres com maiúscula, minúscula, número e símbolo.'} />
          <Field label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
          <ErrorText>{error}</ErrorText>
          <Button title="Criar conta" onPress={submit} loading={loading} />
          <Muted style={{ marginTop: 12 }}>Depois de entrar, ative a verificação em duas etapas em Ajustes → Segurança.</Muted>
        </Card>
      )}
      <Link href="/login" style={{ color: colors.primary, textAlign: 'center', fontWeight: '600', padding: 12 }}>
        Já tenho conta
      </Link>
    </Screen>
  );
}
