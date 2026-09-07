import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { colors, fonts } from '../theme';
import { formatAxisDate, formatShortDate, type LocalDate } from '../lib/dates';
import { Text } from './Text';

export interface ChartPoint {
  date: LocalDate;
  /** null on days with no check-ins at all — the line breaks rather than dipping to 0. */
  total: number | null;
  average: number | null;
}

interface EnergyChartProps {
  /** Oldest first. */
  points: ChartPoint[];
  max: number;
}

const HEIGHT = 170;
const PAD_LEFT = 28;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;

export function EnergyChart({ points, max }: EnergyChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const plotWidth = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) =>
    PAD_LEFT + (points.length <= 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (value: number) => PAD_TOP + plotHeight - (value / max) * plotHeight;

  /** Splits a series into runs of consecutive non-null values so gaps stay gaps. */
  const segments = (pick: (p: ChartPoint) => number | null) => {
    const runs: string[] = [];
    let current: string[] = [];
    points.forEach((p, i) => {
      const v = pick(p);
      if (v == null) {
        if (current.length > 1) runs.push(current.join(' '));
        current = [];
      } else {
        current.push(`${x(i)},${y(v)}`);
      }
    });
    if (current.length > 1) runs.push(current.join(' '));
    return runs;
  };

  const dailySegments = useMemo(
    () => (width ? segments((p) => p.total) : []),
    [points, width, max],
  );
  const averageSegments = useMemo(
    () => (width ? segments((p) => p.average) : []),
    [points, width, max],
  );

  // Four evenly spaced x-axis ticks, matching the mockup's May 1 / 8 / 15 / 22.
  const tickIndices = useMemo(() => {
    if (points.length < 2) return points.map((_, i) => i);
    return [0, 1, 2, 3].map((n) => Math.round((n / 3) * (points.length - 1)));
  }, [points.length]);

  const selectedPoint = selected != null ? points[selected] : null;

  const handleTouch = (locationX: number) => {
    if (!points.length || !width) return;
    const ratio = (locationX - PAD_LEFT) / plotWidth;
    const index = Math.round(ratio * (points.length - 1));
    const clamped = Math.min(Math.max(index, 0), points.length - 1);
    setSelected(clamped);
    void Haptics.selectionAsync();
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text variant="heading">Last 30 days</Text>
        <View style={styles.legend}>
          <LegendDot color={colors.green} label="Daily" />
          <LegendDot color={colors.mint} label="7-day avg" />
        </View>
      </View>

      <Pressable
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPressIn={(e) => handleTouch(e.nativeEvent.locationX)}
        accessibilityRole="adjustable"
        accessibilityLabel="Daily energy totals for the last 30 days"
      >
        <Svg width="100%" height={HEIGHT}>
          {/* y-axis gridline labels at 0, half and full */}
          {[0, max / 2, max].map((value) => (
            <SvgText
              key={value}
              x={PAD_LEFT - 8}
              y={y(value) + 4}
              fontSize={10}
              fontFamily={fonts.regular}
              fill={colors.inkFaint}
              textAnchor="end"
            >
              {Math.round(value)}
            </SvgText>
          ))}

          {/* axes */}
          <Line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={y(0)} stroke={colors.ink} strokeWidth={1.5} />
          <Line x1={PAD_LEFT} y1={y(0)} x2={width - PAD_RIGHT} y2={y(0)} stroke={colors.ink} strokeWidth={1.5} />

          {averageSegments.map((pts, i) => (
            <Polyline
              key={`avg-${i}`}
              points={pts}
              fill="none"
              stroke={colors.mint}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {dailySegments.map((pts, i) => (
            <Polyline
              key={`daily-${i}`}
              points={pts}
              fill="none"
              stroke={colors.green}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {selectedPoint?.total != null && (
            <>
              <Line
                x1={x(selected!)}
                y1={PAD_TOP}
                x2={x(selected!)}
                y2={y(0)}
                stroke={colors.border}
                strokeWidth={1}
              />
              <Circle
                cx={x(selected!)}
                cy={y(selectedPoint.total)}
                r={5}
                fill={colors.white}
                stroke={colors.green}
                strokeWidth={3}
              />
            </>
          )}

          {tickIndices.map((i) => (
            <SvgText
              key={`tick-${i}`}
              x={x(i)}
              y={HEIGHT - 8}
              fontSize={10}
              fontFamily={fonts.regular}
              fill={colors.inkFaint}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            >
              {points[i] ? formatAxisDate(points[i].date) : ''}
            </SvgText>
          ))}
        </Svg>
      </Pressable>

      <View style={styles.hint}>
        {selectedPoint ? (
          <Text variant="smallStrong" center>
            {formatShortDate(selectedPoint.date)} ·{' '}
            {selectedPoint.total == null ? 'no check-ins' : `${selectedPoint.total}/${max}`}
          </Text>
        ) : (
          <Text variant="small" color={colors.inkMuted} center>
            👆 Tap a point to see that day&apos;s total
          </Text>
        )}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" color={colors.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  hint: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
