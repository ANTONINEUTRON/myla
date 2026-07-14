import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';
import { OptionPosition } from '../hooks/useMatchSimulation';

interface PositionsLedgerProps {
  positions: OptionPosition[];
  currentValue: number;
  getCashOutAmount: (pos: OptionPosition) => number;
  onCashOut: (pos: OptionPosition) => void;
}

export default function PositionsLedger({
  positions,
  currentValue,
  getCashOutAmount,
  onCashOut
}: PositionsLedgerProps) {
  if (positions.length === 0) return null;

  return (
    <View style={styles.ledgerSection}>
      <Text style={styles.ledgerHeader}>Your Position Ledger</Text>
      {positions.map((pos) => {
        const cashVal = getCashOutAmount(pos);
        const isPending = pos.status === 'pending';
        // Display check: is currentValue in favor of direction
        const isITM = pos.direction === 'hi' ? currentValue > pos.strikeLevel : currentValue < pos.strikeLevel;

        return (
          <View key={pos.id} style={styles.positionCard}>
            <View style={styles.posHeader}>
              <Text style={styles.posTitle}>
                {pos.asset.toUpperCase()} {pos.direction.toUpperCase()} {pos.strikeLevel}
              </Text>
              {isPending ? (
                <View style={[styles.statusBadge, isITM ? styles.itmBadge : styles.otmBadge]}>
                  <Text style={styles.badgeText}>{isITM ? 'ITM (Win)' : 'OTM (Lose)'}</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, pos.status === 'won' ? styles.wonBadge : pos.status === 'cashed_out' ? styles.cashBadge : styles.lostBadge]}>
                  <Text style={styles.badgeText}>{pos.status.toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={styles.posDetails}>
              <Text style={styles.detailsLabel}>Expiry: Min {pos.strikeMinute}</Text>
              <Text style={styles.detailsLabel}>Odds: {pos.payout}x</Text>
              <Text style={styles.detailsLabel}>Staked: {pos.stake} SOL</Text>
            </View>

            {isPending ? (
              <View style={styles.cashOutRow}>
                <Text style={styles.cashOutLabel}>Est. Return: {(pos.stake * pos.payout).toFixed(2)} SOL</Text>
                <TouchableOpacity style={styles.cashOutBtn} onPress={() => onCashOut(pos)}>
                  <Text style={styles.cashOutBtnTxt}>Cash Out: {cashVal} SOL</Text>
                </TouchableOpacity>
              </View>
            ) : pos.status === 'cashed_out' ? (
              <Text style={styles.settledTxt}>Cashed out early for +{pos.cashOutAmount} SOL</Text>
            ) : pos.status === 'won' ? (
              <Text style={[styles.settledTxt, { color: THEME.colors.yes }]}>Won +{(pos.stake * pos.payout).toFixed(2)} SOL</Text>
            ) : (
              <Text style={[styles.settledTxt, { color: THEME.colors.no }]}>Settled as Lost (-{pos.stake} SOL)</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ledgerSection: { marginTop: 16 },
  ledgerHeader: { color: THEME.colors.text.primary, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  positionCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  posHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  posTitle: { color: THEME.colors.text.primary, fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 100 },
  badgeText: { color: THEME.colors.background, fontSize: 9, fontWeight: '700' },
  itmBadge: { backgroundColor: THEME.colors.yes },
  otmBadge: { backgroundColor: THEME.colors.no },
  wonBadge: { backgroundColor: THEME.colors.yes },
  lostBadge: { backgroundColor: THEME.colors.no },
  cashBadge: { backgroundColor: '#FFD54F' },
  posDetails: { flexDirection: 'row', gap: 10, marginTop: 6 },
  detailsLabel: { color: THEME.colors.text.secondary, fontSize: 10 },
  cashOutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  cashOutLabel: { color: THEME.colors.text.secondary, fontSize: 11, fontWeight: '600' },
  cashOutBtn: { backgroundColor: THEME.colors.primary.DEFAULT, paddingVertical: 4, paddingHorizontal: 10, borderRadius: THEME.borderRadius.sm },
  cashOutBtnTxt: { color: THEME.colors.background, fontSize: 10, fontWeight: '700' },
  settledTxt: { color: THEME.colors.text.muted, fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' }
});
