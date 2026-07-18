import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import PoolBreakdown, { PoolInfo } from './PoolBreakdown';
import CustomStakeModal from './CustomStakeModal';
import { CONFIG } from '../config';

interface TradeTicketProps {
  matchId: string;
  asset: 'goals' | 'corners' | 'cards';
  currentValue: number;
  selection: { strikeMinute: number; strikeLevel: number } | null;
  tradeDirection: 'hi' | 'lo';
  setTradeDirection: (dir: 'hi' | 'lo') => void;
  odds: { hi: number; lo: number };
  stake: number;
  setStake: (val: number) => void;
  onExecute: () => void;
  isTrading?: boolean;
}

const PRESETS = [0.05, 0.1, 0.5];

export default function TradeTicket({
  matchId,
  asset,
  currentValue,
  selection,
  tradeDirection,
  setTradeDirection,
  odds,
  stake,
  setStake,
  onExecute,
  isTrading = false
}: TradeTicketProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [poolData, setPoolData] = useState<{
    overTotal: number;
    underTotal: number;
    overCount: number;
    underCount: number;
    commissionRate: number;
    exists: boolean;
  }>({
    overTotal: 0,
    underTotal: 0,
    overCount: 0,
    underCount: 0,
    commissionRate: 0.05,
    exists: false
  });

  const isCustomSelected = useMemo(() => !PRESETS.includes(stake), [stake]);

  // ─── Fetch Pool details from REST API ──────────────────────────────
  useEffect(() => {
    if (!selection) return;

    let isMounted = true;
    const fetchPoolDetails = async () => {
      setIsLoadingPool(true);
      try {
        const scaledStrikeLevel = Math.round(selection.strikeLevel * 10);
        const url = `${CONFIG.FIREBASE_FUNCTIONS_URL}/getPoolDetails?matchId=${matchId}&asset=${asset}&strikeLevel=${scaledStrikeLevel}&strikeMinute=${selection.strikeMinute}`;
        
        console.log(`[TradeTicket] Fetching pool details: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (isMounted) {
          console.log('[TradeTicket] Pool details loaded:', data);
          // Convert from lamports (string/BN) to SOL
          const overSol = Number(data.overTotal || '0') / 1e9;
          const underSol = Number(data.underTotal || '0') / 1e9;
          
          setPoolData({
            overTotal: overSol,
            underTotal: underSol,
            overCount: data.overCount || 0,
            underCount: data.underCount || 0,
            commissionRate: 0.05, // 5% flat fee
            exists: data.exists || false
          });
        }
      } catch (err) {
        console.warn('[TradeTicket] Failed to load pool state:', err);
      } finally {
        if (isMounted) {
          setIsLoadingPool(false);
        }
      }
    };

    fetchPoolDetails();

    return () => {
      isMounted = false;
    };
  }, [matchId, asset, selection]);

  // ─── Pool payout calculations ─────────────────────────────────────
  const poolInfo: PoolInfo = useMemo(() => {
    const pool = poolData;
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
  }, [poolData, tradeDirection, stake]);

  if (!selection) {
    return (
      <View style={styles.inactiveSheet}>
        <Text style={styles.inactiveSheetTxt}>Tap a future minute/value point on the graph above to trade.</Text>
      </View>
    );
  }

  return (
    <View style={styles.tradeSheet}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.sheetTitle}>
          Target: {asset.toUpperCase()} @ Minute {selection.strikeMinute}
        </Text>
        {isLoadingPool && <ActivityIndicator size="small" color={THEME.colors.primary.DEFAULT} />}
      </View>
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

      <TouchableOpacity 
        style={[styles.confirmTradeBtn, isTrading && { backgroundColor: THEME.colors.border }]} 
        onPress={onExecute}
        disabled={isTrading}
      >
        <Text style={styles.confirmTradeTxt}>
          {isTrading ? 'Processing Transaction...' : `Confirm Prediction  •  ${stake} SOL → ${poolInfo.estPayout.toFixed(3)} SOL`}
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
