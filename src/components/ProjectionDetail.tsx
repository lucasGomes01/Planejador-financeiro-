import { Text, View } from 'react-native';
import { colors } from './theme';
import { money, monthShort } from '../lib/format';
import type { SeriesPoint } from '../lib/finance';
import { Card, Muted, Subtitle } from './ui';

export interface DetailLine { label: string; value: number; hint?: string }

/**
 * Step-by-step explanation of a projected point of the chart.
 * Shown at the end of the page so the chart stays clean.
 */
export function ProjectionDetail({
  data, index, contribLabel, cdiLabel, monthDetail,
}: {
  data: SeriesPoint[];
  index: number | null;
  /** what the contributions are, e.g. "Sobras previstas" */
  contribLabel: string;
  /** e.g. "14,9%" */
  cdiLabel: string;
  /** what entered/left in that month besides yield */
  monthDetail: (ym: string) => DetailLine[];
}) {
  const firstProj = data.findIndex((d) => d.projected);
  const base = firstProj > 0 ? data[firstProj - 1] : null;
  const s = index != null ? data[index] : null;

  if (!base) return null;
  if (!s || !s.projected || s.gainYield == null) {
    return (
      <Card>
        <Subtitle>Detalhamento da previsão</Subtitle>
        <Muted>Toque num mês da linha tracejada do gráfico para ver como o valor foi calculado.</Muted>
      </Card>
    );
  }

  const prev = data[index! - 1];
  const monthYield = s.gainYield - (prev?.gainYield ?? 0);
  const change = s.value - prev.value;
  const lines = monthDetail(s.ym);
  const n = (() => {
    const [ya, ma] = base.ym.split('-').map(Number);
    const [yb, mb] = s.ym.split('-').map(Number);
    return (yb - ya) * 12 + (mb - ma);
  })();

  return (
    <Card>
      <Subtitle>Detalhamento: fim de {monthShort(s.ym)}</Subtitle>

      <Text style={st.section}>No mês de {monthShort(s.ym)}</Text>
      <View style={st.box}>
        <Step label={`Saldo no fim de ${monthShort(prev.ym)}`} value={prev.value} />
        <Step label="+ Juros do CDI no mês" value={monthYield} color={colors.income} />
        {lines.map((l, k) => (
          <View key={k}>
            <Step label={`${l.value < 0 ? '−' : '+'} ${l.label}`} value={Math.abs(l.value)}
              color={l.value < 0 ? colors.expense : colors.income} />
            {l.hint ? <Text style={st.hint}>{l.hint}</Text> : null}
          </View>
        ))}
        <View style={st.sep} />
        <Step label={`= Saldo no fim de ${monthShort(s.ym)}`} value={s.value} bold />
        <Text style={[st.hint, { color: change >= 0 ? colors.income : colors.expense }]}>
          {change >= 0 ? 'Aumento' : 'Redução'} de {money(Math.abs(change))} no mês
        </Text>
      </View>

      <Text style={st.section}>Acumulado de hoje até lá ({n === 1 ? '1 mês' : `${n} meses`})</Text>
      <View style={st.box}>
        <Step label={`Hoje (${monthShort(base.ym)})`} value={base.value} />
        <Step label="+ Juros do CDI" value={s.gainYield} color={colors.income} />
        <Step label={`${(s.gainContrib ?? 0) < 0 ? '−' : '+'} ${contribLabel}`} value={Math.abs(s.gainContrib ?? 0)}
          color={(s.gainContrib ?? 0) < 0 ? colors.expense : colors.income} />
        <View style={st.sep} />
        <Step label="= Total previsto" value={s.value} bold />
      </View>

      <Muted style={{ marginTop: 8 }}>
        Juros brutos (antes do IR), com CDI de {cdiLabel} ao ano. Ações e locais sem % do CDI não rendem na previsão.
        A sobra do mês atual entra no primeiro mês da previsão.
      </Muted>
    </Card>
  );
}

function Step({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: bold ? '700' : '400', flexShrink: 1 }}>{label}</Text>
      <Text style={{ color: color ?? colors.text, fontSize: 13, fontWeight: bold ? '800' : '600' }}>{money(value)}</Text>
    </View>
  );
}

const st = {
  section: { fontSize: 13, fontWeight: '700' as const, color: colors.text, marginTop: 6, marginBottom: 4 },
  box: { backgroundColor: colors.bg, borderRadius: 10, padding: 10, gap: 3 },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  hint: { color: colors.muted, fontSize: 11 },
};
