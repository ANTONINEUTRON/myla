import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { THEME } from '../theme';

interface TradeTicketProps {
  asset: 'goals' | 'corners' | 'cards';
  currentValue: number;
  selection: { strikeMinute: number; strikeLevel: number } | null;
  tradeDirection: 'hi' | 'lo';
  setTradeDirection: (dir: 'hi' | 'lo') => void;
  odds: { hi: number; lo: number };
  stake: number;
  setStake: (val: number) => void;
  onExecute: () => void;
}

export default function TradeTicket({
  asset,
  currentValue,
  selection,
  tradeDirection,
  setTradeDirection,
  odds,
  stake,
  setStake,
  onExecute
}: TradeTicketProps) {
  if (!selection) {
    return (
      <View style={styles.inactiveSheet}>
        <Text style={styles.inactiveSheetTxt}>Tap a future minute/value point on the graph above to trade.</Text>
      </View>
    );
  }

  return (
    <View style={styles.tradeSheet}>
      <Text style={styles.sheetTitle}>
        Target: {asset.toUpperCase()} @ Minute {selection.strikeMinute}
      </Text>
      <Text style={styles.sheetSubtitle}>
        Line: {selection.strikeLevel} (Current Score/Stats: {currentValue})
      </Text>

      <View style={styles.choiceRow}>
        <TouchableOpacity
          style={[styles.choiceBtn, styles.hiBtn, tradeDirection === 'hi' && styles.choiceBtnActiveHI]}
          onPress={() => setTradeDirection('hi')}
        >
          <Text style={styles.choiceLabel}>🟢 HI (&gt; {selection.strikeLevel})</Text>
          <Text style={styles.oddsText}>{odds.hi}x Return</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceBtn, styles.loBtn, tradeDirection === 'lo' && styles.choiceBtnActiveLO]}
          onPress={() => setTradeDirection('lo')}
        >
          <Text style={styles.choiceLabel}>🔴 LO (&lt; {selection.strikeLevel})</Text>
          <Text style={styles.oddsText}>{odds.lo}x Return</Text>
        </TouchableOpacity>
      </View>

      {/* Staking presets */}
      <View style={styles.stakeRow}>
        <Text style={styles.stakeLabel}>Stake:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets}>
          {[0.05, 0.1, 0.25, 0.5, 1.0].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.presetBtn, stake === s && styles.presetBtnActive]}
              onPress={() => setStake(s)}
            >
              <Text style={[styles.presetTxt, stake === s && styles.presetTxtActive]}>
                {s} SOL
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.confirmTradeBtn} onPress={onExecute}>
        <Text style={styles.confirmTradeTxt}>Lock Option Trade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inactiveSheet: {
    backgroundColor: THEME.colors.surfaceElevated,
    marginTop: 12,
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center'
  },
  inactiveSheetTxt: { color: THEME.colors.text.muted, fontSize: 11, textAlign: 'center' },
  tradeSheet: {
    backgroundColor: THEME.colors.surfaceElevated,
    marginTop: 12,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  sheetTitle: { color: THEME.colors.text.primary, fontSize: 14, fontWeight: '700' },
  sheetSubtitle: { color: THEME.colors.text.secondary, fontSize: 11, marginTop: 2 },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  choiceBtn: { flex: 1, padding: 10, borderRadius: THEME.borderRadius.sm, borderWidth: 1, borderColor: THEME.colors.border, alignItems: 'center' },
  hiBtn: { backgroundColor: 'rgba(0, 230, 118, 0.05)' },
  loBtn: { backgroundColor: 'rgba(255, 23, 68, 0.05)' },
  choiceBtnActiveHI: { borderColor: THEME.colors.yes, backgroundColor: 'rgba(0, 230, 118, 0.15)' },
  choiceBtnActiveLO: { borderColor: THEME.colors.no, backgroundColor: 'rgba(255, 23, 68, 0.15)' },
  choiceLabel: { color: THEME.colors.text.primary, fontSize: 10, fontWeight: '700' },
  oddsText: { color: THEME.colors.text.secondary, fontSize: 13, fontWeight: '700', marginTop: 2 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  stakeLabel: { color: THEME.colors.text.secondary, fontSize: 12, fontWeight: '600' },
  presets: { flex: 1 },
  presetBtn: { paddingVertical: 5, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: THEME.borderRadius.sm, marginRight: 5, borderWidth: 1, borderColor: THEME.colors.border },
  presetBtnActive: { backgroundColor: THEME.colors.primary.DEFAULT, borderColor: THEME.colors.primary.DEFAULT },
  presetTxt: { color: THEME.colors.text.secondary, fontSize: 10, fontWeight: '600' },
  presetTxtActive: { color: THEME.colors.background },
  confirmTradeBtn: { backgroundColor: THEME.colors.primary.DEFAULT, paddingVertical: 10, borderRadius: THEME.borderRadius.sm, alignItems: 'center', marginTop: 12 },
  confirmTradeTxt: { color: THEME.colors.background, fontSize: 14, fontWeight: '700' }
});
