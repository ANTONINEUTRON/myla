import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMatchFeed } from '../hooks/useMatchFeed';
import { Match } from '../types';
import { THEME } from '../theme';
import { OptionPosition } from '../hooks/useMatchSimulation';
import { txoddsService } from '../services/txodds';
import InteractiveMatchCard from '../components/InteractiveMatchCard';
import ConfettiCelebration, { ConfettiParticle } from '../components/ConfettiCelebration';
import { useWallet } from '../hooks/useWallet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const { matches, loading, error, refreshMatches } = useMatchFeed();
  const { balance } = useWallet();

  // Expansions coordinate in feed
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Global shared SOL wallet state (initialized and synced from actual wallet balance)
  const [walletBalance, setWalletBalance] = useState<number>(balance);
  const [positions, setPositions] = useState<OptionPosition[]>([]);

  useEffect(() => {
    setWalletBalance(balance);
  }, [balance]);

  // Confetti particles list state
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  // ─── Dropdown Filter States ──────────────────────────────────────
  const [selectedCompetition, setSelectedCompetition] = useState<string>('All Competitions');
  const [statusFilter, setStatusFilter] = useState<'live' | 'upcoming' | 'all'>('upcoming');

  const [compDropdownOpen, setCompDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // ─── Stats Modal Sheet States ────────────────────────────────────
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [selectedStatsMatch, setSelectedStatsMatch] = useState<Match | null>(null);
  const [selectedStatsSim, setSelectedStatsSim] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [realStats, setRealStats] = useState<Record<string, number> | null>(null);

  // Get list of unique competitions in matches data
  const competitionOptions = useMemo(() => {
    const list = matches.map((m) => m.competition).filter(Boolean) as string[];
    return ['All Competitions', ...new Set(list)];
  }, [matches]);

  // Filter matches based on selections
  const filteredMatches = useMemo(() => {
    // 1. Prioritize upcoming, if upcoming filter matches nothing, default to showing what matches filter
    const filtered = matches.filter((m) => {
      const compMatches = selectedCompetition === 'All Competitions' || m.competition === selectedCompetition;
      
      let statusMatches = true;
      if (statusFilter === 'live') {
        statusMatches = m.status === 'live';
      } else if (statusFilter === 'upcoming') {
        statusMatches = m.status === 'upcoming';
      }
      // 'all' includes all statuses (live, upcoming, finished)
      
      return compMatches && statusMatches;
    });

    // Sort by date chronologically (earliest start times first)
    return [...filtered].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [matches, selectedCompetition, statusFilter]);

  // Auto-expand first match when filtered data changes
  useEffect(() => {
    if (filteredMatches.length > 0) {
      setExpandedMatchId(filteredMatches[0].id);
    } else {
      setExpandedMatchId(null);
    }
  }, [filteredMatches]);

  // Confetti animation celebration trigger
  const triggerConfetti = () => {
    const colors = ['#FF6B35', '#00E676', '#38BDF8', '#F59E0B', '#E2E8F0'];
    const particles: ConfettiParticle[] = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      animY: new Animated.Value(-50),
      animX: new Animated.Value(0)
    }));

    setConfetti(particles);

    const anims = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.animY, { toValue: 800, duration: 1500 + Math.random() * 1500, useNativeDriver: true }),
        Animated.timing(p.animX, { toValue: (Math.random() - 0.5) * 80, duration: 1500 + Math.random() * 1500, useNativeDriver: true })
      ])
    );
    Animated.parallel(anims).start(() => setConfetti([]));
  };

  const handleShowStatsModal = async (match: Match, simState?: any) => {
    setSelectedStatsMatch(match);
    setSelectedStatsSim(simState);
    setStatsModalVisible(true);

    // Fetch real stats on-demand
    setStatsLoading(true);
    setRealStats(null);
    try {
      const scores = await txoddsService.getScores(match.id);
      if (scores && scores.length > 0) {
        const latest = scores[scores.length - 1];
        if (latest.Stats && Object.keys(latest.Stats).length > 0) {
          setRealStats(latest.Stats);
        }
      }
    } catch (err) {
      console.warn('Failed to load real stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };


  // ─── Render Stats Progress Bar Row ──────────────────────────────
  const renderStatRow = (label: string, homeVal: number, awayVal: number) => {
    const total = homeVal + awayVal;
    const homePercent = total > 0 ? (homeVal / total) * 100 : 50;
    const awayPercent = 100 - homePercent;

    return (
      <View style={styles.statRow} key={label}>
        <View style={styles.statLabels}>
          <Text style={styles.statValueTxt}>{homeVal}</Text>
          <Text style={styles.statLabelTxt}>{label}</Text>
          <Text style={styles.statValueTxt}>{awayVal}</Text>
        </View>
        <View style={styles.statBarBg}>
          <View style={[styles.statBarHome, { width: `${homePercent}%` }]} />
          <View style={[styles.statBarAway, { width: `${awayPercent}%` }]} />
        </View>
      </View>
    );
  };

  // Prepare key stats from real fetched stats or live simulation
  const statsList = useMemo(() => {
    const list: { label: string; homeVal: number; awayVal: number }[] = [];

    if (selectedStatsSim) {
      const seed = parseInt(selectedStatsMatch?.id || '3') || 3;
      const homeRatio = 0.4 + ((seed % 7) / 30);
      const homeCorners = Math.round(selectedStatsSim.corners * homeRatio);
      const awayCorners = selectedStatsSim.corners - homeCorners;
      const homeCards = Math.round(selectedStatsSim.cards * homeRatio);
      const awayCards = selectedStatsSim.cards - homeCards;

      list.push({ label: 'Corners (Simulated)', homeVal: homeCorners, awayVal: awayCorners });
      list.push({ label: 'Cards (Simulated)', homeVal: homeCards, awayVal: awayCards });
      return list;
    }

    if (realStats) {
      const homeCorners = realStats['3'];
      const awayCorners = realStats['4'];
      if (homeCorners !== undefined && awayCorners !== undefined) {
        list.push({ label: 'Corner Kicks', homeVal: homeCorners, awayVal: awayCorners });
      }

      const homeYellow = realStats['5'] ?? 0;
      const awayYellow = realStats['6'] ?? 0;
      const homeRed = realStats['7'] ?? 0;
      const awayRed = realStats['8'] ?? 0;
      const homeTotalCards = homeYellow + homeRed;
      const awayTotalCards = awayYellow + awayRed;
      if (realStats['5'] !== undefined || realStats['6'] !== undefined) {
        list.push({ label: 'Total Cards', homeVal: homeTotalCards, awayVal: awayTotalCards });
      }
    }

    return list;
  }, [realStats, selectedStatsSim, selectedStatsMatch]);

  const renderItem = ({ item }: { item: Match }) => {
    const isExpanded = item.id === expandedMatchId;
    return (
      <InteractiveMatchCard
        match={item}
        isExpanded={isExpanded}
        onToggleExpand={() => setExpandedMatchId(isExpanded ? null : item.id)}
        walletBalance={walletBalance}
        setWalletBalance={setWalletBalance}
        positions={positions}
        setPositions={setPositions}
        triggerConfetti={triggerConfetti}
        onShowStats={handleShowStatsModal}
      />
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary.DEFAULT} />
          <Text style={styles.emptyText}>Loading match fixtures...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={48} color="#8E8E93" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No Matches Found</Text>
        <Text style={styles.emptySubtitle}>
          {error 
            ? `Failed to fetch from TxODDS: ${error}`
            : 'There are no live or scheduled World Cup matches available on the TxODDS feed right now.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refreshMatches}>
          <Text style={styles.retryBtnTxt}>Refresh Match Feed</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ConfettiCelebration particles={confetti} />

      {/* ─── Top Header Bar ─── */}
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>MYLA</Text>
          <Text style={styles.subtitle}>Sports Binary Options Terminal</Text>
        </View>
        <View style={styles.balancePill}>
          <Text style={styles.balanceText}>{walletBalance.toFixed(3)} SOL</Text>
        </View>
      </View>

      {/* ─── Dropdown Filter Bar ─── */}
      <View style={styles.filterBar}>
        {/* Left Dropdown (Competitions) */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
            setCompDropdownOpen(!compDropdownOpen);
            setStatusDropdownOpen(false);
          }}>
            <Ionicons name="trophy-outline" size={14} color="#FF6B35" />
            <Text style={styles.dropdownBtnTxt} numberOfLines={1}>
              {selectedCompetition}
            </Text>
            <Ionicons name="chevron-down-outline" size={12} color="#8E8E93" />
          </TouchableOpacity>

          {compDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {competitionOptions.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCompetition(c);
                    setCompDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemTxt, selectedCompetition === c && styles.dropdownItemActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Right Dropdown (States) */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
            setStatusDropdownOpen(!statusDropdownOpen);
            setCompDropdownOpen(false);
          }}>
            <Ionicons name="filter-outline" size={14} color="#FF6B35" />
            <Text style={styles.dropdownBtnTxt} numberOfLines={1}>
              {statusFilter === 'all' ? 'All Matches' : statusFilter.toUpperCase()}
            </Text>
            <Ionicons name="chevron-down-outline" size={12} color="#8E8E93" />
          </TouchableOpacity>

          {statusDropdownOpen && (
            <View style={styles.dropdownMenuRight}>
              {(['live', 'upcoming', 'all'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setStatusFilter(s);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemTxt, statusFilter === s && styles.dropdownItemActive]}>
                    {s === 'all' ? 'All Matches' : s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ─── Match feed list ─── */}
      <FlatList
        data={filteredMatches}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={loading && matches.length > 0}
            onRefresh={refreshMatches}
            tintColor={THEME.colors.primary.DEFAULT}
          />
        }
      />

      {/* ─── Stats Slide-up Modal Sheet ─── */}
      {selectedStatsMatch && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={statsModalVisible}
          onRequestClose={() => setStatsModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={styles.modalDismissArea} onPress={() => setStatsModalVisible(false)} />
            <View style={styles.modalSheet}>
              {/* Sheet Handle bar */}
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Match Analytics</Text>
                <TouchableOpacity onPress={() => setStatsModalVisible(false)}>
                  <Ionicons name="close-outline" size={24} color="#F5F5F7" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {/* Scoreboard display header */}
                <View style={styles.modalScoreboard}>
                  <View style={styles.modalTeam}>
                    <Ionicons name="shirt-outline" size={28} color="#FF6B35" style={{ marginBottom: 4 }} />
                    <Text style={styles.modalTeamName} numberOfLines={1}>{selectedStatsMatch.homeTeam}</Text>
                  </View>
                  <Text style={styles.modalScore}>
                    {selectedStatsSim ? selectedStatsSim.homeScore : selectedStatsMatch.homeScore} - {selectedStatsSim ? selectedStatsSim.awayScore : selectedStatsMatch.awayScore}
                  </Text>
                  <View style={styles.modalTeam}>
                    <Ionicons name="shirt-outline" size={28} color="#38BDF8" style={{ marginBottom: 4 }} />
                    <Text style={styles.modalTeamName} numberOfLines={1}>{selectedStatsMatch.awayTeam}</Text>
                  </View>
                </View>

                {selectedStatsSim && (
                  <View style={styles.simulatedLabelWrapper}>
                    <View style={styles.simulatedLiveDot} />
                    <Text style={styles.simulatedLabelTxt}>
                      Simulated Minute: {selectedStatsSim.minute}'
                    </Text>
                  </View>
                )}

                {statsLoading ? (
                  <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 40 }} />
                ) : statsList.length > 0 ? (
                  <View style={styles.statsList}>
                    {statsList.map((item) => renderStatRow(item.label, item.homeVal, item.awayVal))}
                  </View>
                ) : (
                  <View style={styles.noStatsContainer}>
                    <Ionicons name="bar-chart-outline" size={44} color="#8E8E93" style={{ marginBottom: 12 }} />
                    <Text style={styles.noStatsTitle}>No statistics available</Text>
                    <Text style={styles.noStatsSubtitle}>
                      Detailed statistics for this match are not currently reported in the TxODDS feed.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, paddingTop: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  titleWrapper: { alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '900', color: THEME.colors.text.primary },
  subtitle: { fontSize: 11, color: THEME.colors.text.secondary, marginTop: 2 },
  balancePill: { backgroundColor: THEME.colors.primary.glow, borderRadius: THEME.borderRadius.md, paddingVertical: 6, paddingHorizontal: 12 },
  balanceText: { color: THEME.colors.primary.DEFAULT, fontSize: 13, fontWeight: '700' },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100, // ensure dropdown overlaps content
  },
  dropdownContainer: {
    width: '48%',
    position: 'relative',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'space-between',
    gap: 6
  },
  dropdownBtnTxt: {
    color: THEME.colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 38,
    left: 0,
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    zIndex: 101,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  dropdownMenuRight: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    zIndex: 101,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  dropdownItemTxt: {
    color: THEME.colors.text.secondary,
    fontSize: 11,
    fontWeight: '500'
  },
  dropdownItemActive: {
    color: THEME.colors.primary.DEFAULT,
    fontWeight: '700'
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1, zIndex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: THEME.colors.text.primary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: THEME.colors.text.secondary, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  emptyText: { color: THEME.colors.text.secondary, fontSize: 14, marginTop: 16, fontWeight: '600' },
  retryBtn: {
    backgroundColor: THEME.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.md,
  },
  retryBtnTxt: { color: THEME.colors.background, fontSize: 14, fontWeight: '700' },

  // Stats Bottom Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#0F1219',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '65%', // slides up and takes 65% of height as requested
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 15
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5F5F7',
  },
  modalScroll: {
    paddingBottom: 30
  },
  modalScoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalTeam: {
    flex: 1,
    alignItems: 'center',
  },
  modalFlag: {
    fontSize: 32,
    marginBottom: 4
  },
  modalTeamName: {
    color: '#F5F5F7',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    width: '90%'
  },
  modalScore: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F5F5F7',
    marginHorizontal: 12
  },
  modalLiveLabel: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16
  },
  statsList: {
    marginTop: 12,
    gap: 16
  },
  statRow: {
    width: '100%',
  },
  statLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center'
  },
  statValueTxt: {
    color: '#F5F5F7',
    fontSize: 13,
    fontWeight: '700',
    width: 30,
    textAlign: 'center'
  },
  statLabelTxt: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600'
  },
  statBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden'
  },
  statBarHome: {
    backgroundColor: '#FF6B35',
    height: '100%'
  },
  statBarAway: {
    backgroundColor: '#38BDF8',
    height: '100%'
  },
  noStatsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  noStatsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F7',
    marginBottom: 6,
    textAlign: 'center'
  },
  noStatsSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18
  },
  simulatedLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
    gap: 6
  },
  simulatedLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35'
  },
  simulatedLabelTxt: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700'
  }
});
