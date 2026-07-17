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
  walletBalance: number;
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>;
  positions: OptionPosition[];
  setPositions: React.Dispatch<React.SetStateAction<OptionPosition[]>>;
  triggerConfetti: () => void;
  onShowStats: (match: Match, simState?: any) => void;
}

export default function InteractiveMatchCard({
  match,
  isExpanded,
  onToggleExpand,
  walletBalance,
  setWalletBalance,
  positions,
  setPositions,
  triggerConfetti,
  onShowStats
}: InteractiveMatchCardProps) {
  
  // Call simulation hook inside card context
  const {
    simState,
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
    getCashOutAmount
  } = useMatchSimulation(
    isExpanded ? match : null, // only simulate if expanded
    triggerConfetti,
    walletBalance,
    setWalletBalance,
    positions,
    setPositions
  );

  const matchPositions = positions.filter((p) => p.matchId === match.id);
  const chartWidth = SCREEN_WIDTH - 54;

  const formattedDate = useMemo(() => {
    const d = new Date(match.startTime);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [match.startTime]);

  const renderStatusBadge = (status: Match['status'], minute?: number) => {
    switch (status) {
      case 'live':
        return (
          <View style={styles.badgeContainer}>
            <View style={[styles.badgeDot, { backgroundColor: '#E53935' }]} />
            <Text style={[styles.badgeTxt, { color: '#E53935' }]}>LIVE Min {minute?.toString()}'</Text>
          </View>
        );
      case 'upcoming':
        return (
          <View style={styles.badgeContainer}>
            <Ionicons name="calendar-outline" size={12} color="#FF6B35" />
            <Text style={[styles.badgeTxt, { color: '#FF6B35' }]}>UPCOMING</Text>
          </View>
        );
      case 'finished':
        return (
          <View style={styles.badgeContainer}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#8E8E93" />
            <Text style={[styles.badgeTxt, { color: '#8E8E93' }]}>FINISHED</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.matchCard, isExpanded && styles.expandedCard]}>
      {/* Card Header toggle */}
      <TouchableOpacity style={styles.cardHeader} onPress={onToggleExpand}>
        <View style={styles.matchMeta}>
          <View>
            {isExpanded
              ? renderStatusBadge(simState.status, simState.minute)
              : renderStatusBadge(match.status, match.minute)}
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
          {(() => {
            const status = isExpanded ? simState.status : match.status;
            const hScore = isExpanded ? simState.homeScore : match.homeScore;
            const aScore = isExpanded ? simState.awayScore : match.awayScore;
            if (status === 'upcoming') {
              return <Text style={styles.score}>VS</Text>;
            }
            return (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.score}>{hScore} - {aScore}</Text>
                {status === 'finished' && (
                  <Text style={styles.ftLabel}>FT</Text>
                )}
              </View>
            );
          })()}
          <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
            {match.awayTeam}
          </Text>
        </View>

        {!isExpanded && (
          <Text style={styles.expandHint}>Tap to open </Text>
        )}
      </TouchableOpacity>

      {/* Expanded terminal panel */}
      {isExpanded && (
        <View style={styles.terminalContainer}>

          {/* Asset toggle bar */}
          <View style={styles.assetTabs}>
            {(['corners', 'goals', 'cards'] as OptionAsset[]).map((tab) => {
              const isActive = asset === tab;
              const iconColor = isActive ? THEME.colors.primary.DEFAULT : '#8E8E93';
              let iconName: any = 'football-outline';
              if (tab === 'corners') iconName = 'flag-outline';
              else if (tab === 'cards') iconName = 'square-outline';

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.assetTab, isActive && styles.assetTabActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                  onPress={() => {
                    setAsset(tab);
                    setSelection(null);
                  }}
                >
                  <Ionicons name={iconName} size={13} color={iconColor} />
                  <Text style={[styles.assetLabel, isActive && styles.assetLabelActive]}>
                    {tab === 'corners' ? 'Corners' : tab === 'goals' ? 'Goals' : 'Cards'}:{' '}
                    {tab === 'goals'
                      ? simState.homeScore + simState.awayScore
                      : tab === 'corners'
                      ? simState.corners
                      : simState.cards}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  ftLabel: { color: THEME.colors.primary.DEFAULT, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 2, backgroundColor: THEME.colors.primary.glow, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
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
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeTxt: {
    fontSize: 11,
    fontWeight: '700'
  }
});
