import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle, type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
          <View style={s.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[s.screen, s.inner, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}
export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={s.subtitle}>{children}</Text>;
}
export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function Button({
  title, onPress, variant = 'primary', loading, disabled, small,
}: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean; disabled?: boolean; small?: boolean;
}) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, danger: colors.danger, ghost: 'transparent' }[variant];
  const fg = { primary: '#fff', secondary: colors.primary, danger: '#fff', ghost: colors.primary }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#94A3B8" {...props} style={[s.input, props.style]} />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, value === o.value && s.segActive]}>
          <Text style={[s.segText, value === o.value && s.segTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const c = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, { borderColor: c, backgroundColor: active ? c : 'transparent' }]}
      accessibilityState={{ selected: active }}
    >
      <Text style={{ color: active ? '#fff' : c, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={s.error}>{children}</Text>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={[s.muted, { textAlign: 'center', paddingVertical: 16 }]}>{children}</Text>;
}

const s = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 96 },
  inner: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  card: {
    backgroundColor: colors.card, borderRadius: radius, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 13 },
  btn: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 16, color: colors.text, backgroundColor: '#fff',
  },
  seg: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  segActive: { backgroundColor: '#fff' },
  segText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  segTextActive: { color: colors.text },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  error: { color: colors.danger, marginBottom: 10, fontSize: 14 },
});
