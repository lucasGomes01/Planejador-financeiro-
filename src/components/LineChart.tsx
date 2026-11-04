import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from './theme';
import { money, moneyCompact, monthShort } from '../lib/format';
import type { SeriesPoint } from '../lib/finance';

const H = 220;
const PAD = { l: 56, r: 22, t: 12, b: 28 };

export function LineChart({ data, color = colors.primary }: { data: SeriesPoint[]; color?: string }) {
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

  return (
    <View onLayout={onLayout}>
      {s ? (
        <View style={{ marginBottom: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {monthShort(s.ym)}{s.projected ? ' · projeção' : ''}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{money(s.value)}</Text>
          {s.projected && s.gainYield != null ? (
            <>
              <Text style={{ color: colors.income, fontWeight: '700', marginTop: 2 }}>
                Ganho previsto até aqui: {money(s.gainYield + (s.gainContrib ?? 0))}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                rendimento {money(s.gainYield)} · aportes {money(s.gainContrib ?? 0)}
              </Text>
            </>
          ) : data.some((d) => d.projected) && sel == null ? (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Toque na linha tracejada para ver o ganho previsto.</Text>
          ) : null}
        </View>
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
