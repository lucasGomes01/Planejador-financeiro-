import { useEffect, useState } from 'react';
import { Platform, Switch, Text } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { prefs } from '../../lib/secureStorage';
import { parseMoney } from '../../lib/format';
import { BIOMETRIC_PREF } from '../../components/AppLock';
import { Button, Card, ErrorText, Field, Muted, Row, Screen, Subtitle } from '../../components/ui';
import { colors } from '../../components/theme';

export default function Settings() {
  const { session, signOut } = useAuth();
  const { settings, saveSettings } = useData();
  const [cdi, setCdi] = useState(String(settings.cdi_annual_rate).replace('.', ','));
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [bio, setBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => setCdi(String(settings.cdi_annual_rate).replace('.', ',')), [settings.cdi_annual_rate]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    prefs.get(BIOMETRIC_PREF).then((v) => setBio(v === '1'));
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([h, e]) => setBioAvailable(h && e));
  }, []);

  async function saveCdi() {
    setMsg(''); setError('');
    const v = parseMoney(cdi);
    if (!(v >= 0 && v <= 100)) return setError('Taxa inválida.');
    try { await saveSettings({ cdi_annual_rate: v }); setMsg('Salvo!'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
  }

  async function toggleBio(on: boolean) {
    if (on) {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme para ativar o bloqueio' });
      if (!r.success) return;
    }
    await prefs.set(BIOMETRIC_PREF, on ? '1' : '0');
    setBio(on);
  }

  return (
    <Screen>
      <Card>
        <Subtitle>Taxa CDI</Subtitle>
        <Field label="CDI anual (%)" value={cdi} onChangeText={setCdi} keyboardType="decimal-pad"
          hint="Usada para estimar o rendimento dos investimentos atrelados ao CDI." />
        <ErrorText>{error}</ErrorText>
        {msg ? <Text style={{ color: colors.primary, marginBottom: 8 }}>{msg}</Text> : null}
        <Button title="Salvar taxa" onPress={saveCdi} />
      </Card>

      <Card>
        <Subtitle>Segurança</Subtitle>
        <Muted style={{ marginBottom: 10 }}>Conta: {session?.user.email}</Muted>
        {Platform.OS !== 'web' && (
          <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ flex: 1, color: bioAvailable ? colors.text : colors.muted }}>
              Bloquear com digital / rosto{bioAvailable ? '' : ' (indisponível neste aparelho)'}
            </Text>
            <Switch value={bio} onValueChange={toggleBio} disabled={!bioAvailable} />
          </Row>
        )}
        {Platform.OS === 'web' && <Muted style={{ marginBottom: 12 }}>Na web, a sessão é encerrada após 15 minutos sem uso.</Muted>}
        <Button title="Verificação em duas etapas e senha" variant="secondary" onPress={() => router.push('/security')} />
      </Card>

      <Button title="Sair" variant="danger" onPress={signOut} />
    </Screen>
  );
}
