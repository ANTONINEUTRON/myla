import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import PoolBreakdown, { PoolInfo } from './PoolBreakdown';
import CustomStakeModal from './CustomStakeModal';

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

// ─── Static demo pool data (replaced by on-chain reads later) ────────
const DEMO_POOL = {
  overTotal: 0.85,   // SOL staked on Over
  underTotal: 0.55,  // SOL staked on Under
  overCount: 4,      // Number of Over bettors
  underCount: 3,     // Number of Under bettors
  commissionRate: 0.05, // 5%
};

const PRESETS = [0.05, 0.1, 0.5];

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
  const [showCustomModal, setShowCustomModal] = useState(false);

  const isCustomSelected = useMemo(() => !PRESETS.includes(stake), [stake]);

  // ─── Pool payout calculations ─────────────────────────────────────
  const poolInfo: PoolInfo = useMemo(() => {
    const pool = DEMO_POOL;
    const mySide = tradeDirection === 'hi' ? 'over' : 'under';
    const mySideTotal = (mySide === 'over' ? pool.overTotal : pool.underTotal) + stake;
    const oppSideTotal = mySide === 'over' ? pool.underTotal : pool.overTotal;
    const totalPool = mySideTotal + oppSideTotal;
    const commission = totalPool * pool.commissionRate;
    const distributable = totalPool - commission;
    const myShare = stake / mySideTotal;
    const estPayout = myShare * distributable;
    const estProfit = estPayout - stake;
    const effOdds = estPayout / stake;

    const overTotalWithStake = tradeDirection === 'hi' ? pool.overTotal + stake : pool.overTotal;
    const underTotalWithStake = tradeDirection === 'lo' ? pool.underTotal + stake : pool.underTotal;
    const totalWithStake = overTotalWithStake + underTotalWithStake;
    const overPct = totalWithStake > 0 ? (overTotalWithStake / totalWithStake) * 100 : 50;

    // Calculate effective odds for each side independently
    const overSideForCalc = pool.overTotal + stake;
    const overPoolTotal = overSideForCalc + pool.underTotal;
    const overDistributable = overPoolTotal * (1 - pool.commissionRate);
    const overEffOdds = overSideForCalc > 0 ? (stake / overSideForCalc) * overDistributable / stake : 0;

    const underSideForCalc = pool.underTotal + stake;
    const underPoolTotal = pool.overTotal + underSideForCalc;
    const underDistributable = underPoolTotal * (1 - pool.commissionRate);
    const underEffOdds = underSideForCalc > 0 ? (stake / underSideForCalc) * underDistributable / stake : 0;

    return {
      overTotal: overTotalWithStake,
      underTotal: underTotalWithStake,
      overCount: tradeDirection === 'hi' ? pool.overCount + 1 : pool.overCount,
      underCount: tradeDirection === 'lo' ? pool.underCount + 1 : pool.underCount,
      totalPool,
      estPayout,
      estProfit,
      effOdds,
      overEffOdds,
      underEffOdds,
      mySharePct: myShare * 100,
      overPct,
      hasOpponents: oppSideTotal > 0,
    };
  }, [tradeDirection, stake]);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="arrow-up-circle" size={16} color="#00E676" />
            <Text style={styles.choiceLabel}>OVER (&gt; {selection.strikeLevel})</Text>
          </View>
          <Text style={styles.oddsText}>{poolInfo.overEffOdds.toFixed(2)}× Payout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceBtn, styles.loBtn, tradeDirection === 'lo' && styles.choiceBtnActiveLO]}
          onPress={() => setTradeDirection('lo')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="arrow-down-circle" size={16} color="#FF6B35" />
            <Text style={styles.choiceLabel}>UNDER (&lt; {selection.strikeLevel})</Text>
          </View>
          <Text style={styles.oddsText}>{poolInfo.underEffOdds.toFixed(2)}× Payout</Text>
        </TouchableOpacity>
      </View>

      {/* Staking presets */}
      <View style={styles.stakeRow}>
        <Text style={styles.stakeLabel}>Stake:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets}>
          {PRESETS.map((s) => (
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
          <TouchableOpacity
            style={[styles.presetBtn, isCustomSelected && styles.presetBtnActive]}
            onPress={() => setShowCustomModal(true)}
          >
            <Text style={[styles.presetTxt, isCustomSelected && styles.presetTxtActive]}>
              {isCustomSelected ? `${stake} SOL` : 'Custom...'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Pool Breakdown Component */}
      <PoolBreakdown poolInfo={poolInfo} />

      <TouchableOpacity style={styles.confirmTradeBtn} onPress={onExecute}>
        <Text style={styles.confirmTradeTxt}>
          Confirm Prediction  •  {stake} SOL → {poolInfo.estPayout.toFixed(3)} SOL
        </Text>
      </TouchableOpacity>

      {/* Custom Stake Input Dialog Modal */}
      <CustomStakeModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        stake={stake}
        setStake={setStake}
      />
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
  confirmTradeBtn: {
    backgroundColor: THEME.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    marginTop: 14,
  },
  confirmTradeTxt: {
    color: THEME.colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
});
