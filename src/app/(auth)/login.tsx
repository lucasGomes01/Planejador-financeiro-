import { useState } from 'react';
import { Link } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { supabase, isConfigured } from '../../lib/supabase';
import { isEmail } from '../../lib/password';
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from '../../components/ui';
import { colors } from '../../components/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    setError(''); setInfo('');
    if (!isEmail(email) || !password) return setError('Informe e-mail e senha.');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    // Generic message on purpose: do not reveal whether the e-mail exists.
    if (err) setError(err.message.includes('confirm') ? 'Confirme seu e-mail antes de entrar.' : 'E-mail ou senha inválidos.');
  }

  async function forgot() {
    setError(''); setInfo('');
    if (!isEmail(email)) return setError('Digite seu e-mail acima para recuperar a senha.');
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    setInfo('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
  }

  return (
    <Screen>
      <View style={{ height: 48 }} />
      <Title>Planejador Financeiro</Title>
      <Muted style={{ marginBottom: 16 }}>Entre para ver seu planejamento.</Muted>
      {!isConfigured && (
        <ErrorText>Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.</ErrorText>
      )}
      <Card>
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          autoComplete="email" textContentType="emailAddress" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"
          textContentType="password" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        {info ? <Text style={{ color: colors.primary, marginBottom: 10 }}>{info}</Text> : null}
        <Button title="Entrar" onPress={submit} loading={loading} />
        <View style={{ height: 8 }} />
        <Button title="Esqueci minha senha" variant="ghost" onPress={forgot} />
      </Card>
      <Link href="/signup" style={{ color: colors.primary, textAlign: 'center', fontWeight: '600', padding: 12 }}>
        Não tem conta? Criar conta
      </Link>
    </Screen>
  );
}
