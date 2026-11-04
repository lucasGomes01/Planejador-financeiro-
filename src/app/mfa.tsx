import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, ErrorText, Field, Muted, Screen } from '../components/ui';

/** Second step of login for users with an authenticator app enrolled. */
export default function Mfa() {
  const { refreshAal, signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp?.[0]?.id ?? null));
  }, []);

  async function verify() {
    if (!factorId) return;
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setLoading(false);
    if (err) return setError('Código inválido. Tente novamente.');
    await refreshAal();
  }

  return (
    <Screen>
      <Card>
        <Muted style={{ marginBottom: 12 }}>Digite o código de 6 dígitos do seu app autenticador.</Muted>
        <Field label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6}
          autoComplete="one-time-code" textContentType="oneTimeCode" onSubmitEditing={verify} />
        <ErrorText>{error}</ErrorText>
        <Button title="Verificar" onPress={verify} loading={loading} disabled={code.trim().length !== 6} />
        <Button title="Sair" variant="ghost" onPress={signOut} />
      </Card>
    </Screen>
  );
}
