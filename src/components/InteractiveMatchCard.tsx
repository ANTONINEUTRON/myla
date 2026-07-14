import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Match } from '../types';
import { useMatchSimulation, OptionPosition, OptionAsset } from '../hooks/useMatchSimulation';
import TimelineChart from './TimelineChart';
import TradeTicket from './TradeTicket';
import PositionsLedger from './PositionsLedger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InteractiveMatchCardProps {
  match: Match;
  isExpanded: boolean;
  onToggleExpand: () => void;
  demoBalance: number;
  setDemoBalance: React.Dispatch<React.SetStateAction<number>>;
  positions: OptionPosition[];
  setPositions: React.Dispatch<React.SetStateAction<OptionPosition[]>>;
  triggerConfetti: () => void;
  onShowStats: (match: Match, simState?: any) => void;
}

export default function InteractiveMatchCard({
  match,
  isExpanded,
  onToggleExpand,
  demoBalance,
  setDemoBalance,
  positions,
  setPositions,
  triggerConfetti,
  onShowStats
}: InteractiveMatchCardProps) {
  
  // Call simulation hook inside card context
  const {
    simState,
    isRunning,
    setIsRunning,
    asset,
    setAsset,
    stake,
    setStake,
    tradeDirection,
    setTradeDirection,
    selection,
    setSelection,
    odds,
    goalsHistory,
    cornersHistory,
    cardsHistory,
    maxVal,
    currentValue,
    executeTrade,
    cashOut,
    getCashOutAmount,
    resetSimulation
  } = useMatchSimulation(
    isExpanded ? match : null, // only simulate if expanded
    triggerConfetti,
    demoBalance,
    setDemoBalance,
    positions,
    setPositions
  );

  const matchPositions = positions.filter((p) => p.matchId === match.id);
  const chartWidth = SCREEN_WIDTH - 54;

  const formattedDate = useMemo(() => {
    const d = new Date(match.startTime);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [match.startTime]);

  return (
    <View style={[styles.matchCard, isExpanded && styles.expandedCard]}>
      {/* Card Header toggle */}
      <TouchableOpacity style={styles.cardHeader} onPress={onToggleExpand}>
        <View style={styles.matchMeta}>
          <View>
            <Text style={styles.matchStatus}>
              {isExpanded
                ? (simState.status === 'live'
                    ? `🔴 LIVE Min ${simState.minute}'`
                    : simState.status === 'upcoming'
                      ? '⚽ UPCOMING'
                      : '⚽ FINISHED')
                : (match.status === 'live'
                    ? `🔴 LIVE Min ${match.minute}'`
                    : match.status === 'upcoming'
                      ? '⚽ UPCOMING'
                      : '⚽ FINISHED')}
            </Text>
            <Text style={styles.matchDate}>{formattedDate}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {matchPositions.length > 0 && (
              <View style={styles.posPill}>
                <Text style={styles.posPillTxt}>{matchPositions.length} Trade(s)</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onShowStats(match, isExpanded ? simState : null);
              }}
              style={styles.statsIconBtn}
            >
              <Ionicons name="stats-chart-outline" size={16} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Text style={[styles.teamName, { textAlign: 'left' }]} numberOfLines={1}>
            {match.homeTeam}
          </Text>
          <Text style={styles.score}>
            {isExpanded ? simState.homeScore : match.homeScore} - {isExpanded ? simState.awayScore : match.awayScore}
          </Text>
          <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
            {match.awayTeam}
          </Text>
        </View>

        {!isExpanded && (
          <Text style={styles.expandHint}>Tap to open interactive options chart ↓</Text>
        )}
      </TouchableOpacity>

      {/* Expanded terminal panel */}
      {isExpanded && (
        <View style={styles.terminalContainer}>
          {/* Game Controls */}
          <View style={styles.simRow}>
            <TouchableOpacity style={styles.simBtn} onPress={() => setIsRunning(!isRunning)}>
              <Text style={styles.simBtnTxt}>{isRunning ? '⏸ Pause Game' : '▶ Resume Game'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.simBtn} onPress={resetSimulation}>
              <Text style={styles.simBtnTxt}>🔄 Reset Sim</Text>
            </TouchableOpacity>
          </View>

          {/* Asset toggle bar */}
          <View style={styles.assetTabs}>
            {(['corners', 'goals', 'cards'] as OptionAsset[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.assetTab, asset === tab && styles.assetTabActive]}
                onPress={() => {
                  setAsset(tab);
                  setSelection(null);
                }}
              >
                <Text style={[styles.assetLabel, asset === tab && styles.assetLabelActive]}>
                  {tab === 'corners' ? '🚩 Corners' : tab === 'goals' ? '⚽ Goals' : '🎴 Cards'}:{' '}
                  {tab === 'goals'
                    ? simState.homeScore + simState.awayScore
                    : tab === 'corners'
                    ? simState.corners
                    : simState.cards}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dynamic SVG Line Chart */}
          <TimelineChart
            chartWidth={chartWidth}
            asset={asset}
            currentMinute={simState.minute}
            currentValue={currentValue}
            maxVal={maxVal}
            goalsHistory={goalsHistory}
            cornersHistory={cornersHistory}
            cardsHistory={cardsHistory}
            selection={selection}
            onSelect={setSelection}
          />

          {/* Option ticket form */}
          <TradeTicket
            asset={asset}
            currentValue={currentValue}
            selection={selection}
            tradeDirection={tradeDirection}
            setTradeDirection={setTradeDirection}
            odds={odds}
            stake={stake}
            setStake={setStake}
            onExecute={executeTrade}
          />

          {/* User Positions list ledger */}
          <PositionsLedger
            positions={matchPositions}
            currentValue={currentValue}
            getCashOutAmount={getCashOutAmount}
            onCashOut={cashOut}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden'
  },
  expandedCard: { borderColor: THEME.colors.primary.DEFAULT },
  cardHeader: { width: '100%' },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  matchStatus: { color: THEME.colors.primary.DEFAULT, fontSize: 12, fontWeight: '700' },
  posPill: { backgroundColor: THEME.colors.primary.glow, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 100 },
  posPillTxt: { color: THEME.colors.primary.light, fontSize: 10, fontWeight: '700' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  teamName: { color: THEME.colors.text.primary, fontSize: 15, fontWeight: '700', flex: 1 },
  score: { color: THEME.colors.text.primary, fontSize: 20, fontWeight: '800', marginHorizontal: 12 },
  expandHint: { color: THEME.colors.text.muted, fontSize: 10, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  terminalContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: THEME.colors.border, paddingTop: 16 },
  simRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 12 },
  simBtn: { backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: THEME.borderRadius.sm },
  simBtnTxt: { color: THEME.colors.text.secondary, fontSize: 11, fontWeight: '600' },
  assetTabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  assetTab: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: THEME.colors.surfaceElevated, borderRadius: THEME.borderRadius.md, borderWidth: 1, borderColor: THEME.colors.border },
  assetTabActive: { borderColor: THEME.colors.primary.DEFAULT, backgroundColor: THEME.colors.primary.glow },
  assetLabel: { color: THEME.colors.text.secondary, fontSize: 10, fontWeight: '600' },
  assetLabelActive: { color: THEME.colors.primary.DEFAULT },
  statsIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,107,53,0.06)',
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  matchDate: {
    color: THEME.colors.text.secondary,
    fontSize: 9,
    marginTop: 2,
    fontWeight: '500'
  }
});
