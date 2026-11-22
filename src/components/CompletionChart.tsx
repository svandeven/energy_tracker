import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '../theme';
import { useI18n } from '../i18n';
import type { CompletionPoint } from '../lib/goals';
import { Text } from './Text';

const HEIGHT = 170;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
const GAP = 10;

/** Bars for each day's completion rate, with the 7-day average as a line. */
export function CompletionChart({ points }: { points: CompletionPoint[] }) {
  const { t, fmt } = useI18n();
  const [width, setWidth] = useState(0);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barWidth = points.length
    ? Math.max((width - GAP * (points.length - 1)) / points.length, 4)
    : 0;
  const cx = (i: number) => i * (barWidth + GAP) + barWidth / 2;
  const y = (value: number) => PAD_TOP + plotHeight - value * plotHeight;

  const line = points
    .map((p, i) => (p.average == null ? null : `${cx(i)},${y(p.average)}`))
    .filter(Boolean)
    .join(' ');

  return (
    <View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={points
          .map(
            (p) =>
              `${fmt.axisDate(p.date)}: ${p.rate == null ? '–' : `${Math.round(p.rate * 100)}%`}`,
          )
          .join(', ')}
      >
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke={colors.border} strokeWidth={1} />
            {points.map((p, i) => {
              const value = p.rate ?? 0;
              const h = Math.max(value * plotHeight, p.rate == null ? 0 : 3);
              return (
                <Rect
                  key={p.date}
                  x={i * (barWidth + GAP)}
                  y={y(0) - h}
                  width={barWidth}
                  height={h}
                  rx={4}
                  fill={colors.tint}
                />
              );
            })}
            {line.includes(' ') && (
              <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth={2} />
            )}
            {points.map((p, i) => (
              <SvgText
                key={`l-${p.date}`}
                x={cx(i)}
                y={HEIGHT - 6}
                fontSize={11}
                fontFamily={fonts.regular}
                fill={colors.inkMuted}
                textAnchor="middle"
              >
                {fmt.weekday(p.date)}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.swatch} />
          <Text variant="caption" color={colors.inkMuted}>
            {t('progress.daily')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.dash} />
          <Text variant="caption" color={colors.inkMuted}>
            {t('progress.averageLegend')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.tint },
  dash: { width: 14, height: 2, backgroundColor: colors.accent },
});
