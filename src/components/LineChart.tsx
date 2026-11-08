import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from './theme';
import { money, moneyCompact, monthShort } from '../lib/format';
import type { SeriesPoint } from '../lib/finance';

const H = 220;
const PAD = { l: 56, r: 22, t: 12, b: 28 };

export function LineChart({
  data, color = colors.primary, contribLabel = 'Aportes', cdiLabel, monthDetail,
}: {
  /** what entered/left in a projected month besides yield (e.g. previous month's surplus) */
  monthDetail?: (ym: string) => { label: string; value: number; hint?: string }[];
  data: SeriesPoint[];
  color?: string;
  /** what the contributions are, e.g. "Sobra mensal prevista" */
  contribLabel?: string;
  /** e.g. "14,9%" */
  cdiLabel?: string;
}) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const w = Math.max(0, width - PAD.l - PAD.r);
  const h = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => PAD.t + h - ((v - min) / (max - min || 1)) * h;

  const firstProj = data.findIndex((d) => d.projected);
  const realEnd = firstProj === -1 ? data.length - 1 : firstProj - 1;
  const pathFor = (from: number, to: number) =>
    data.slice(from, to + 1).map((d, k) => `${k === 0 ? 'M' : 'L'}${x(from + k).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const real = pathFor(0, realEnd);
  const area = realEnd >= 0 ? `${real} L${x(realEnd)},${y(min)} L${x(0)},${y(min)} Z` : '';
  const proj = firstProj > 0 ? pathFor(firstProj - 1, data.length - 1) : '';

  const ticks = [min, (min + max) / 2, max];
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(w / 56))));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const s = sel != null ? data[sel] : data[realEnd >= 0 ? realEnd : 0];
  const base = realEnd >= 0 ? data[realEnd] : null;

  return (
    <View onLayout={onLayout}>
      {s ? (
        s.projected && s.gainYield != null && base ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Previsto em {monthShort(s.ym)} (daqui a {monthsAhead(base.ym, s.ym)})
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{money(s.value)}</Text>
            <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, marginTop: 6, gap: 3 }}>
              <Step label={`Hoje (${monthShort(base.ym)})`} value={base.value} />
              <Step label="+ Juros do CDI até lá" value={s.gainYield} color={colors.income} />
              <Step label={`+ ${contribLabel}`} value={s.gainContrib ?? 0} color={(s.gainContrib ?? 0) < 0 ? colors.expense : colors.income} />
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
              <Step label="= Total previsto" value={s.value} bold />
            </View>
            {sel != null && monthDetail ? (() => {
              const prev = data[sel - 1];
              const monthYield = s.gainYield - (prev?.gainYield ?? 0);
              const lines = monthDetail(s.ym);
              const change = s.value - (prev?.value ?? s.value);
              return (
                <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, marginTop: 6, gap: 3 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    De {prev ? monthShort(prev.ym) : ''} para {monthShort(s.ym)}
                  </Text>
                  <Step label="+ Juros do mês" value={monthYield} color={colors.income} />
                  {lines.map((l, k) => (
                    <View key={k}>
                      <Step label={`${l.value < 0 ? '−' : '+'} ${l.label}`} value={Math.abs(l.value)}
                        color={l.value < 0 ? colors.expense : colors.income} />
                      {l.hint ? <Text style={{ color: colors.muted, fontSize: 11 }}>{l.hint}</Text> : null}
                    </View>
                  ))}
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
                  <Step label={change >= 0 ? '= Aumento no mês' : '= Redução no mês'} value={Math.abs(change)} bold />
                </View>
              );
            })() : null}
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              Juros brutos (antes do IR){cdiLabel ? `, com CDI de ${cdiLabel} ao ano` : ''}. Ações e locais sem % do CDI não rendem na previsão.
            </Text>
          </View>
        ) : (
          <View style={{ marginBottom: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{monthShort(s.ym)}</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{money(s.value)}</Text>
            {data.some((d) => d.projected) ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                Toque na linha tracejada para ver quanto você terá em cada mês.
              </Text>
            ) : null}
          </View>
        )
      ) : null}
      {width > 0 && (
        <Svg width={width} height={H}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((t, i) => (
            <Line key={i} x1={PAD.l} x2={PAD.l + w} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`l${i}`} x={PAD.l - 6} y={y(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
              {moneyCompact(t)}
            </SvgText>
          ))}
          {area ? <Path d={area} fill="url(#fill)" /> : null}
          {real ? <Path d={real} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" /> : null}
          {proj ? <Path d={proj} stroke={color} strokeWidth={2} fill="none" strokeDasharray="6 5" opacity={0.7} /> : null}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <SvgText key={`x${i}`} x={x(i)} y={H - 8} fontSize={10} fill={colors.muted} textAnchor="middle">
                {monthShort(d.ym)}
              </SvgText>
            ) : null,
          )}
          {sel != null && (
            <>
              <Line x1={x(sel)} x2={x(sel)} y1={PAD.t} y2={PAD.t + h} stroke={colors.muted} strokeDasharray="3 3" />
              <Circle cx={x(sel)} cy={y(data[sel].value)} r={5} fill={color} stroke="#fff" strokeWidth={2} />
            </>
          )}
          {data.map((_, i) => (
            <Rect
              key={`h${i}`} x={x(i) - step / 2} y={PAD.t} width={Math.max(step, 8)} height={h} fill="transparent"
              onPress={() => setSel(sel === i ? null : i)}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

function monthsAhead(from: string, to: string) {
  const [ya, ma] = from.split('-').map(Number);
  const [yb, mb] = to.split('-').map(Number);
  const n = (yb - ya) * 12 + (mb - ma);
  return n === 1 ? '1 mês' : `${n} meses`;
}

function Step({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: bold ? '700' : '400', flexShrink: 1 }}>{label}</Text>
      <Text style={{ color: color ?? colors.text, fontSize: 13, fontWeight: bold ? '800' : '600' }}>{money(value)}</Text>
    </View>
  );
}
