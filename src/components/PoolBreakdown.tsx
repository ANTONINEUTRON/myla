import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export interface PoolInfo {
  overTotal: number;
  underTotal: number;
  overCount: number;
  underCount: number;
  totalPool: number;
  estPayout: number;
  estProfit: number;
  effOdds: number;
  overEffOdds: number;
  underEffOdds: number;
  mySharePct: number;
  overPct: number;
  hasOpponents: boolean;
}

interface PoolBreakdownProps {
  poolInfo: PoolInfo;
}

export default function PoolBreakdown({ poolInfo }: PoolBreakdownProps) {
  return (
    <View style={styles.poolPanel}>
      <Text style={styles.poolTitle}>Pool Breakdown</Text>

      {/* Distribution bar */}
      <View style={styles.poolBarContainer}>
        <View style={styles.poolBarLabels}>
          <Text style={styles.poolBarLabelOver}>
            Over {poolInfo.overTotal.toFixed(2)} SOL ({poolInfo.overCount})
          </Text>
          <Text style={styles.poolBarLabelUnder}>
            Under {poolInfo.underTotal.toFixed(2)} SOL ({poolInfo.underCount})
          </Text>
        </View>
        <View style={styles.poolBarTrack}>
          <View
            style={[
              styles.poolBarFillOver,
              { width: `${poolInfo.overPct}%` as any },
            ]}
          />
          <View
            style={[
              styles.poolBarFillUnder,
              { width: `${100 - poolInfo.overPct}%` as any },
            ]}
          />
        </View>
      </View>

      {/* Payout stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Est. Payout</Text>
          <Text style={[styles.statValue, { color: THEME.colors.yes }]}>
            {poolInfo.estPayout.toFixed(3)} SOL
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Est. Profit</Text>
          <Text
            style={[
              styles.statValue,
              { color: poolInfo.estProfit > 0 ? THEME.colors.yes : THEME.colors.no },
            ]}
          >
            {poolInfo.estProfit > 0 ? '+' : ''}
            {poolInfo.estProfit.toFixed(3)} SOL
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Eff. Odds</Text>
          <Text style={styles.statValue}>{poolInfo.effOdds.toFixed(2)}×</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Your Share</Text>
          <Text style={styles.statValue}>{poolInfo.mySharePct.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Warning if no opponents */}
      {!poolInfo.hasOpponents && (
        <View style={styles.warningBanner}>
          <Ionicons name="hourglass-outline" size={12} color="#FFB300" />
          <Text style={styles.warningText}>
            Waiting for opponents — refunded if no one joins the other side
          </Text>
        </View>
      )}

      {/* Odds shift disclaimer */}
      {poolInfo.hasOpponents && (
        <View style={styles.disclaimerRow}>
          <Ionicons name="information-circle-outline" size={11} color={THEME.colors.text.muted} />
          <Text style={styles.disclaimerText}>Odds shift as more players join the pool</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  poolPanel: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: THEME.borderRadius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  poolTitle: {
    color: THEME.colors.text.secondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  poolBarContainer: {
    marginBottom: 12,
  },
  poolBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  poolBarLabelOver: {
    color: THEME.colors.yes,
    fontSize: 9,
    fontWeight: '700',
  },
  poolBarLabelUnder: {
    color: THEME.colors.no,
    fontSize: 9,
    fontWeight: '700',
  },
  poolBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: THEME.colors.background,
  },
  poolBarFillOver: {
    backgroundColor: THEME.colors.yes,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    opacity: 0.7,
  },
  poolBarFillUnder: {
    backgroundColor: THEME.colors.no,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  statItem: {
    width: '48%',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  statLabel: {
    color: THEME.colors.text.muted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: THEME.colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(255,179,0,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.15)',
  },
  warningText: {
    color: '#FFB300',
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  disclaimerText: {
    color: THEME.colors.text.muted,
    fontSize: 9,
    fontWeight: '500',
  },
});
