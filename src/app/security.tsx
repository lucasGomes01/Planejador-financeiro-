import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { passwordProblems } from '../lib/password';
import { useAuth } from '../context/AuthContext';
import { confirm } from '../lib/confirm';
import { Button, Card, ErrorText, Field, Muted, Screen, Subtitle } from '../components/ui';
import { colors } from '../components/theme';

interface Enrollment { id: string; qr: string; secret: string }

export default function Security() {
  const { session, refreshAal } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaMsg, setMfaMsg] = useState('');

  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp?.find((f) => f.status === 'verified')?.id ?? null);
  }
  useEffect(() => { loadFactors(); }, []);

  async function startEnroll() {
    setMfaError(''); setMfaMsg('');
    // Clean up abandoned, unverified factors first.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `app-${Date.now()}` });
    if (error || !data) return setMfaError(error?.message ?? 'Erro ao iniciar');
    const raw = data.totp.qr_code;
    const svg = raw.startsWith('data:') ? decodeURIComponent(raw.slice(raw.indexOf(',') + 1)) : raw;
    setEnroll({ id: data.id, qr: svg, secret: data.totp.secret });
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setMfaError('');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    if (error) return setMfaError('Código inválido.');
    setEnroll(null); setCode(''); setMfaMsg('Verificação em duas etapas ativada.');
    await loadFactors(); await refreshAal();
  }

  async function disable() {
    if (!factorId || !(await confirm('Desativar a verificação em duas etapas?', 'Desativar'))) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return setMfaError(error.message);
    setMfaMsg('Verificação em duas etapas desativada.');
    await loadFactors(); await refreshAal();
  }

  async function changePassword() {
    setPwError(''); setPwMsg('');
    const probs = passwordProblems(pw);
    if (probs.length) return setPwError(`A nova senha precisa de: ${probs.join(', ')}.`);
    if (pw !== pw2) return setPwError('As senhas não conferem.');
    if (!session?.user.email) return;
    setBusy(true);
    // Re-check the current password before allowing the change.
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: session.user.email, password: current });
    if (authErr) { setBusy(false); return setPwError('Senha atual incorreta.'); }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setPwError(error.message);
    setCurrent(''); setPw(''); setPw2(''); setPwMsg('Senha alterada.');
  }

  return (
    <Screen>
      <Card>
        <Subtitle>Verificação em duas etapas (2FA)</Subtitle>
        <Muted style={{ marginBottom: 12 }}>
          Use um app autenticador (Google Authenticator, Authy, 1Password…). Depois de ativada, todo login pedirá o código.
        </Muted>
        {factorId ? (
          <>
            <Text style={{ color: colors.income, fontWeight: '700', marginBottom: 12 }}>✓ Ativada</Text>
            <Button title="Desativar" variant="danger" onPress={disable} />
          </>
        ) : enroll ? (
          <>
            <View style={{ alignItems: 'center', backgroundColor: '#fff', padding: 8, marginBottom: 12 }}>
              <SvgXml xml={enroll.qr} width={200} height={200} />
            </View>
            <Muted style={{ marginBottom: 12 }}>Ou digite a chave: {enroll.secret}</Muted>
            <Field label="Código do app" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            <Button title="Confirmar e ativar" onPress={confirmEnroll} disabled={code.trim().length !== 6} />
          </>
        ) : (
          <Button title="Ativar 2FA" onPress={startEnroll} />
        )}
        <View style={{ height: 8 }} />
        <ErrorText>{mfaError}</ErrorText>
        {mfaMsg ? <Text style={{ color: colors.primary }}>{mfaMsg}</Text> : null}
      </Card>

      <Card>
        <Subtitle>Alterar senha</Subtitle>
        <Field label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
        <Field label="Nova senha" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password"
          hint="Mín. 10 caracteres com maiúscula, minúscula, número e símbolo." />
        <Field label="Confirmar nova senha" value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" />
        <ErrorText>{pwError}</ErrorText>
        {pwMsg ? <Text style={{ color: colors.primary, marginBottom: 8 }}>{pwMsg}</Text> : null}
        <Button title="Alterar senha" onPress={changePassword} loading={busy} />
      </Card>
    </Screen>
  );
}
