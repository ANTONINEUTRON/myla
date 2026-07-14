import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Rect
} from 'react-native-svg';
import { THEME } from '../theme';

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 15, bottom: 25, left: 35, right: 15 };

interface TimelineChartProps {
  chartWidth: number;
  asset: 'goals' | 'corners' | 'cards';
  currentMinute: number;
  currentValue: number;
  maxVal: number;
  goalsHistory: number[];
  cornersHistory: number[];
  cardsHistory: number[];
  selection: { strikeMinute: number; strikeLevel: number } | null;
  onSelect: (selection: { strikeMinute: number; strikeLevel: number }) => void;
}

export default function TimelineChart({
  chartWidth,
  asset,
  currentMinute,
  currentValue,
  maxVal,
  goalsHistory,
  cornersHistory,
  cardsHistory,
  selection,
  onSelect
}: TimelineChartProps) {
  const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Render stepped path coordinates
  const stepPath = useMemo(() => {
    const history = asset === 'goals' ? goalsHistory : asset === 'corners' ? cornersHistory : cardsHistory;
    if (!history || history.length === 0) return '';

    let d = '';
    for (let m = 0; m <= currentMinute; m++) {
      const val = history[m] ?? 0;
      const x = CHART_PADDING.left + (m / 90) * plotWidth;
      const y = CHART_HEIGHT - CHART_PADDING.bottom - (val / maxVal) * plotHeight;

      if (m === 0) {
        d += `M ${x} ${y}`;
      } else {
        const prevVal = history[m - 1] ?? 0;
        const prevY = CHART_HEIGHT - CHART_PADDING.bottom - (prevVal / maxVal) * plotHeight;
        d += ` L ${x} ${prevY} L ${x} ${y}`;
      }
    }
    return d;
  }, [asset, goalsHistory, cornersHistory, cardsHistory, currentMinute, plotWidth, plotHeight, maxVal]);

  const handleTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const xMin = CHART_PADDING.left;
    const xMax = chartWidth - CHART_PADDING.right;
    const yMin = CHART_PADDING.top;
    const yMax = CHART_HEIGHT - CHART_PADDING.bottom;

    if (locationX < xMin || locationX > xMax || locationY < yMin || locationY > yMax) return;

    const relativeX = locationX - CHART_PADDING.left;
    const relativeY = CHART_HEIGHT - CHART_PADDING.bottom - locationY;

    const touchedMin = Math.round((relativeX / plotWidth) * 90);
    const touchedVal = (relativeY / plotHeight) * maxVal;

    if (touchedMin > currentMinute && touchedMin <= 90) {
      const snappedMin = Math.round(touchedMin / 5) * 5;
      if (snappedMin > currentMinute) {
        const snappedVal = Math.round(touchedVal * 2) / 2;
        if (snappedVal >= 0 && snappedVal <= maxVal) {
          onSelect({ strikeMinute: snappedMin, strikeLevel: snappedVal });
        }
      }
    }
  };

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.svgContainer} onTouchStart={handleTouch} onTouchMove={handleTouch}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="hiGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00E676" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="loGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF1744" stopOpacity="0.0" />
              <Stop offset="100%" stopColor="#FF1744" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const value = Math.round((i * maxVal) / 4);
            const y = CHART_HEIGHT - CHART_PADDING.bottom - (value / maxVal) * plotHeight;
            return (
              <React.Fragment key={i}>
                <Line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={chartWidth - CHART_PADDING.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <SvgText
                  x={CHART_PADDING.left - 10}
                  y={y + 4}
                  fill="#8E8E93"
                  fontSize={9}
                  textAnchor="end"
                >
                  {value}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Shaded Call/Put target zones */}
          {selection && (
            <>
              <Rect
                x={CHART_PADDING.left + (currentMinute / 90) * plotWidth}
                y={CHART_PADDING.top}
                width={((selection.strikeMinute - currentMinute) / 90) * plotWidth}
                height={
                  CHART_HEIGHT -
                  CHART_PADDING.bottom -
                  CHART_PADDING.top -
                  (selection.strikeLevel / maxVal) * plotHeight
                }
                fill="url(#hiGlow)"
              />
              <Rect
                x={CHART_PADDING.left + (currentMinute / 90) * plotWidth}
                y={CHART_HEIGHT - CHART_PADDING.bottom - (selection.strikeLevel / maxVal) * plotHeight}
                width={((selection.strikeMinute - currentMinute) / 90) * plotWidth}
                height={(selection.strikeLevel / maxVal) * plotHeight}
                fill="url(#loGlow)"
              />
            </>
          )}

          {/* Historical Stepped curve */}
          {stepPath !== '' && (
            <Path d={stepPath} fill="none" stroke={THEME.colors.primary.DEFAULT} strokeWidth={2} />
          )}

          {/* Live Separator */}
          {(() => {
            const x = CHART_PADDING.left + (currentMinute / 90) * plotWidth;
            return (
              <Line
                x1={x}
                y1={CHART_PADDING.top}
                x2={x}
                y2={CHART_HEIGHT - CHART_PADDING.bottom}
                stroke="#FF6B35"
                strokeDasharray="4, 4"
                strokeWidth={1.5}
              />
            );
          })()}

          {/* Snapped crosshair selector */}
          {selection && (() => {
            const x = CHART_PADDING.left + (selection.strikeMinute / 90) * plotWidth;
            const y = CHART_HEIGHT - CHART_PADDING.bottom - (selection.strikeLevel / maxVal) * plotHeight;
            return (
              <>
                <Line x1={CHART_PADDING.left} y1={y} x2={x} y2={y} stroke="rgba(255, 255, 255, 0.4)" strokeDasharray="3, 3" />
                <Line x1={x} y1={y} x2={x} y2={CHART_HEIGHT - CHART_PADDING.bottom} stroke="rgba(255, 255, 255, 0.4)" strokeDasharray="3, 3" />
                <Circle cx={x} cy={y} r={7} fill="rgba(255,107,53,0.3)" />
                <Circle cx={x} cy={y} r={3.5} fill="#FF6B35" />
              </>
            );
          })()}

          {/* Axis minutes labels */}
          <SvgText x={CHART_PADDING.left} y={CHART_HEIGHT - 6} fill="#8E8E93" fontSize={9} textAnchor="middle">0'</SvgText>
          <SvgText x={CHART_PADDING.left + plotWidth / 2} y={CHART_HEIGHT - 6} fill="#8E8E93" fontSize={9} textAnchor="middle">45'</SvgText>
          <SvgText x={chartWidth - CHART_PADDING.right} y={CHART_HEIGHT - 6} fill="#8E8E93" fontSize={9} textAnchor="middle">90'</SvgText>
        </Svg>
      </View>
      <Text style={styles.chartHint}>Drag inside the future zone right of the dotted line to target</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  svgContainer: { alignSelf: 'center', overflow: 'hidden' },
  chartHint: { color: THEME.colors.text.muted, fontSize: 8, textAlign: 'center', marginTop: 4 }
});
