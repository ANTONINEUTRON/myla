import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert
} from 'react-native';
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
import { useMatchFeed } from '../hooks/useMatchFeed';
import { Match } from '../types';
import { useWallet } from '../hooks/useWallet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 15, bottom: 25, left: 35, right: 15 };

type OptionAsset = 'goals' | 'corners' | 'cards';

interface OptionPosition {
  id: string;
  asset: OptionAsset;
  strikeMinute: number;
  strikeLevel: number;
  direction: 'hi' | 'lo';
  buyMinute: number;
  buyValue: number;
  stake: number;
  payout: number;
  status: 'pending' | 'won' | 'lost' | 'cashed_out';
  cashOutAmount?: number;
}

interface ConfettiParticle {
  id: number;
  color: string;
  left: number;
  animY: Animated.Value;
  animX: Animated.Value;
}

export default function MatchDetailsScreen({ route, navigation }: any) {
  const { matchId } = route.params;
  const { matches } = useMatchFeed();
  
  // Find match from feed or fallback to mock
  const feedMatch = matches.find((m) => m.id === matchId);
  
  // ─── Local State ──────────────────────────────────────────────────
  const { balance } = useWallet();
  const [asset, setAsset] = useState<OptionAsset>('corners');
  const [walletBalance, setWalletBalance] = useState<number>(balance);
  const [stake, setStake] = useState<number>(0.1);
  const [positions, setPositions] = useState<OptionPosition[]>([]);

  useEffect(() => {
    setWalletBalance(balance);
  }, [balance]);
  
  // Match simulator states
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // seconds per match minute
  const [matchState, setMatchState] = useState({
    minute: 15, // start at minute 15 for live action demo
    homeScore: feedMatch?.homeScore ?? 0,
    awayScore: feedMatch?.awayScore ?? 0,
    corners: 2,
    cards: 1,
    status: 'live' as Match['status']
  });

  // Confetti state
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  // Historical event lists to step-up (0-90 minutes)
  const [goalsHistory, setGoalsHistory] = useState<number[]>([]);
  const [cornersHistory, setCornersHistory] = useState<number[]>([]);
  const [cardsHistory, setCardsHistory] = useState<number[]>([]);

  // User interactive crosshair target state
  const [selection, setSelection] = useState<{
    strikeMinute: number;
    strikeLevel: number;
  } | null>(null);

  // Selected trade direction on crosshair
  const [tradeDirection, setTradeDirection] = useState<'hi' | 'lo'>('hi');

  // ─── SVG Layout Coordinates ───────────────────────────────────────
  const chartWidth = SCREEN_WIDTH - 32;
  const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Maximum scale values
  const maxValues: Record<OptionAsset, number> = {
    goals: 6,
    corners: 12,
    cards: 8
  };
  const maxVal = maxValues[asset];

  // Map Match state to current value based on asset type
  const currentValue = useMemo(() => {
    if (asset === 'goals') return matchState.homeScore + matchState.awayScore;
    if (asset === 'corners') return matchState.corners;
    return matchState.cards;
  }, [asset, matchState]);

  // ─── Initialize Simulator Histories ──────────────────────────────
  useEffect(() => {
    // Seed history up to start minute (15)
    const initHistory = (lambda: number, startVal: number) => {
      const arr = new Array(91).fill(0);
      let val = 0;
      for (let m = 1; m <= 90; m++) {
        if (m <= 15) {
          // Weighted probability step-ups
          if (val < startVal && Math.random() < 0.25) {
            val += 1;
          }
        }
        arr[m] = m <= 15 ? val : 0;
      }
      // Ensure startVal is matched exactly at min 15
      arr[15] = startVal;
      for (let m = 15; m <= 90; m++) {
        arr[m] = startVal;
      }
      return arr;
    };

    const initialGoals = feedMatch ? feedMatch.homeScore + feedMatch.awayScore : 0;
    setGoalsHistory(initHistory(0.03, initialGoals));
    setCornersHistory(initHistory(0.12, 2));
    setCardsHistory(initHistory(0.05, 1));
  }, [feedMatch]);

  // ─── Live Match simulation Timer ─────────────────────────────────
  useEffect(() => {
    let timer: any;
    if (isRunning && matchState.status === 'live') {
      timer = setInterval(() => {
        setMatchState((prev) => {
          if (prev.minute >= 90) {
            setIsRunning(false);
            return { ...prev, status: 'finished' };
          }

          const nextMin = prev.minute + 1;
          let newHome = prev.homeScore;
          let newAway = prev.awayScore;
          let newCorners = prev.corners;
          let newCards = prev.cards;

          // Clone arrays
          const nextGoalsArr = [...goalsHistory];
          const nextCornersArr = [...cornersHistory];
          const nextCardsArr = [...cardsHistory];

          // 1. Roll for Corners (12% chance)
          if (Math.random() < 0.12) {
            newCorners += 1;
          }
          nextCornersArr[nextMin] = newCorners;
          for (let i = nextMin + 1; i <= 90; i++) nextCornersArr[i] = newCorners;
          setCornersHistory(nextCornersArr);

          // 2. Roll for Cards (5% chance)
          if (Math.random() < 0.05) {
            newCards += 1;
          }
          nextCardsArr[nextMin] = newCards;
          for (let i = nextMin + 1; i <= 90; i++) nextCardsArr[i] = newCards;
          setCardsHistory(nextCardsArr);

          // 3. Roll for Goals (3% chance)
          if (Math.random() < 0.03) {
            if (Math.random() > 0.5) newHome += 1;
            else newAway += 1;
          }
          const totalGoals = newHome + newAway;
          nextGoalsArr[nextMin] = totalGoals;
          for (let i = nextMin + 1; i <= 90; i++) nextGoalsArr[i] = totalGoals;
          setGoalsHistory(nextGoalsArr);

          // Settle positions that reached strike minute
          setPositions((prevPositions) =>
            prevPositions.map((pos) => {
              if (pos.status === 'pending' && nextMin >= pos.strikeMinute) {
                let actualVal = 0;
                if (pos.asset === 'goals') actualVal = totalGoals;
                else if (pos.asset === 'corners') actualVal = newCorners;
                else actualVal = newCards;

                const won =
                  pos.direction === 'hi'
                    ? actualVal > pos.strikeLevel
                    : actualVal < pos.strikeLevel;

                if (won) {
                  const winnings = pos.stake * pos.payout;
                  setWalletBalance((b) => b + winnings);
                  triggerConfetti();
                }

                return { ...pos, status: won ? 'won' : 'lost' };
              }
              return pos;
            })
          );

          return {
            ...prev,
            minute: nextMin,
            homeScore: newHome,
            awayScore: newAway,
            corners: newCorners,
            cards: newCards
          };
        });
      }, simSpeed * 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, simSpeed, goalsHistory, cornersHistory, cardsHistory]);

  // ─── Option Payout Odds Engine ─────────────────────────────────────
  const odds = useMemo(() => {
    if (!selection) return { hi: 1.0, lo: 1.0 };
    const timeRemaining = selection.strikeMinute - matchState.minute;
    if (timeRemaining <= 0) return { hi: 1.0, lo: 1.0 };

    const rates = {
      goals: 2.5 / 90,
      corners: 9.5 / 90,
      cards: 4.0 / 90
    };
    const lambda = rates[asset];
    const mean = lambda * timeRemaining;
    const distance = selection.strikeLevel - currentValue;

    // Normal probability approximation (logistic Z-score model)
    const z = (distance - mean) / Math.sqrt(mean + 0.15);
    const probHi = 1 / (1 + Math.exp(1.6 * z));
    const clampedHi = Math.max(0.04, Math.min(0.96, probHi));
    const clampedLo = 1 - clampedHi;

    return {
      hi: parseFloat((0.95 / clampedHi).toFixed(2)),
      lo: parseFloat((0.95 / clampedLo).toFixed(2))
    };
  }, [selection, asset, currentValue, matchState.minute]);

  // ─── Dynamic Option position valuation formula ──────────────────────
  const getCashOutAmount = (pos: OptionPosition) => {
    if (pos.status !== 'pending') return 0;
    
    const minutesRemaining = pos.strikeMinute - matchState.minute;
    if (minutesRemaining <= 0) return 0;
    
    const totalDuration = pos.strikeMinute - pos.buyMinute;
    if (totalDuration <= 0) return 0;
    
    const timeElapsedRatio = (matchState.minute - pos.buyMinute) / totalDuration;
    
    let currentAssetVal = currentValue;
    if (pos.asset === 'goals') currentAssetVal = matchState.homeScore + matchState.awayScore;
    else if (pos.asset === 'cards') currentAssetVal = matchState.cards;
    
    const isITM = pos.direction === 'hi' ? currentAssetVal > pos.strikeLevel : currentAssetVal < pos.strikeLevel;
    
    const initialCost = pos.stake;
    const maxPayout = pos.stake * pos.payout;
    
    if (isITM) {
      // ITM returns increase towards maxPayout capped at 90%
      const markup = (maxPayout - initialCost) * (0.3 + 0.6 * timeElapsedRatio);
      return parseFloat(Math.min(initialCost + markup, maxPayout * 0.9).toFixed(3));
    } else {
      // OTM returns decay down to 10% value
      const distance = Math.abs(currentAssetVal - pos.strikeLevel);
      const decayFactor = Math.max(0.1, 1 - (distance * 0.25) - (timeElapsedRatio * 0.6));
      return parseFloat((initialCost * decayFactor).toFixed(3));
    }
  };

  // ─── Visual SVG Stepped Graph builder ─────────────────────────────
  const stepPath = useMemo(() => {
    const history =
      asset === 'goals'
        ? goalsHistory
        : asset === 'corners'
        ? cornersHistory
        : cardsHistory;

    if (history.length === 0) return '';

    let d = '';
    for (let m = 0; m <= matchState.minute; m++) {
      const val = history[m] ?? 0;
      const x = CHART_PADDING.left + (m / 90) * plotWidth;
      const y = CHART_HEIGHT - CHART_PADDING.bottom - (val / maxVal) * plotHeight;

      if (m === 0) {
        d += `M ${x} ${y}`;
      } else {
        const prevVal = history[m - 1] ?? 0;
        const prevY =
          CHART_HEIGHT - CHART_PADDING.bottom - (prevVal / maxVal) * plotHeight;
        d += ` L ${x} ${prevY} L ${x} ${y}`;
      }
    }
    return d;
  }, [asset, goalsHistory, cornersHistory, cardsHistory, matchState.minute, plotWidth, plotHeight, maxVal]);

  // ─── Touch coordinate converter ────────────────────────────────────
  const handleGraphTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    const xMin = CHART_PADDING.left;
    const xMax = chartWidth - CHART_PADDING.right;
    const yMin = CHART_PADDING.top;
    const yMax = CHART_HEIGHT - CHART_PADDING.bottom;
    
    if (locationX < xMin || locationX > xMax || locationY < yMin || locationY > yMax) {
      return;
    }

    const relativeX = locationX - CHART_PADDING.left;
    const relativeY = CHART_HEIGHT - CHART_PADDING.bottom - locationY;

    // Convert raw touch to Match Minute
    const touchedMin = Math.round((relativeX / plotWidth) * 90);
    
    // Convert Y to Stat Count
    const touchedVal = (relativeY / plotHeight) * maxVal;

    // Validate that user selected a future minute (Trading Zone)
    if (touchedMin > matchState.minute && touchedMin <= 90) {
      // Snap to nearest 5-minute strike cell
      const snappedMin = Math.round(touchedMin / 5) * 5;
      
      if (snappedMin > matchState.minute) {
        // Snap to nearest 0.5 statistic count
        const snappedVal = Math.round(touchedVal * 2) / 2;
        
        if (snappedVal >= 0 && snappedVal <= maxVal) {
          setSelection({
            strikeMinute: snappedMin,
            strikeLevel: snappedVal
          });
        }
      }
    }
  };

  // ─── Confirm & Place Simulated Trade ──────────────────────────────
  const handleExecuteTrade = () => {
    if (!selection) return;
    if (walletBalance < stake) {
      Alert.alert('Insufficient Balance', 'You need more SOL to open this position.');
      return;
    }

    const oddsRatio = tradeDirection === 'hi' ? odds.hi : odds.lo;
    const newPosition: OptionPosition = {
      id: Math.random().toString(36).substr(2, 9),
      asset,
      strikeMinute: selection.strikeMinute,
      strikeLevel: selection.strikeLevel,
      direction: tradeDirection,
      buyMinute: matchState.minute,
      buyValue: currentValue,
      stake,
      payout: oddsRatio,
      status: 'pending'
    };

    setWalletBalance((b) => parseFloat((b - stake).toFixed(2)));
    setPositions((prev) => [newPosition, ...prev]);
    
    // Reset selection after trade
    setSelection(null);
    Alert.alert('Trade Confirmed', `Position locked: ${asset.toUpperCase()} ${tradeDirection.toUpperCase()} ${selection.strikeLevel} @ Min ${selection.strikeMinute}`);
  };

  // ─── Trigger Cash Out early ────────────────────────────────────────
  const handleCashOut = (pos: OptionPosition) => {
    const cashOutVal = getCashOutAmount(pos);
    setWalletBalance((b) => parseFloat((b + cashOutVal).toFixed(2)));
    setPositions((prev) =>
      prev.map((p) => (p.id === pos.id ? { ...p, status: 'cashed_out', cashOutAmount: cashOutVal } : p))
    );
  };

  // ─── Confetti Celebration Particle Trigger ───────────────────────
  const triggerConfetti = () => {
    const colors = ['#FF6B35', '#00E676', '#38BDF8', '#F59E0B', '#E2E8F0'];
    const particles: ConfettiParticle[] = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      animY: new Animated.Value(-50),
      animX: new Animated.Value(0)
    }));

    setConfetti(particles);

    const animations = particles.map((p) => {
      return Animated.parallel([
        Animated.timing(p.animY, {
          toValue: 800,
          duration: 1500 + Math.random() * 1500,
          useNativeDriver: true
        }),
        Animated.timing(p.animX, {
          toValue: (Math.random() - 0.5) * 80,
          duration: 1500 + Math.random() * 1500,
          useNativeDriver: true
        })
      ]);
    });

    Animated.parallel(animations).start(() => {
      setConfetti([]);
    });
  };

  // Reset simulation to min 0
  const handleResetSimulation = () => {
    setMatchState({
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      corners: 0,
      cards: 0,
      status: 'live'
    });
    setGoalsHistory(new Array(91).fill(0));
    setCornersHistory(new Array(91).fill(0));
    setCardsHistory(new Array(91).fill(0));
    setPositions([]);
    setSelection(null);
  };

  return (
    <View style={styles.container}>
      {/* ─── Confetti Overlay ─── */}
      {confetti.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              backgroundColor: p.color,
              left: `${p.left}%`,
              transform: [{ translateY: p.animY }, { translateX: p.animX }]
            }
          ]}
        />
      ))}

      {/* ─── Top Score HUD ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← Matches</Text>
        </TouchableOpacity>
        <View style={styles.balancePill}>
          <Text style={styles.balanceText}>{walletBalance.toFixed(2)} SOL</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Board */}
        <View style={styles.scoreboard}>
          <View style={styles.teamsRow}>
            <Text style={styles.teamText}>{feedMatch?.homeTeam ?? 'Home'}</Text>
            <Text style={styles.scoreText}>
              {matchState.homeScore} - {matchState.awayScore}
            </Text>
            <Text style={styles.teamText}>{feedMatch?.awayTeam ?? 'Away'}</Text>
          </View>
          <View style={styles.simControls}>
            <Text style={styles.timeText}>Min {matchState.minute}'</Text>
          </View>
        </View>

        {/* ─── Graph Title & Asset Selector ─── */}
        <View style={styles.assetTabs}>
          <TouchableOpacity
            style={[styles.assetTab, asset === 'corners' && styles.assetTabActive]}
            onPress={() => {
              setAsset('corners');
              setSelection(null);
            }}
          >
            <Text style={[styles.assetLabel, asset === 'corners' && styles.assetLabelActive]}>
              🚩 Corners ({matchState.corners})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assetTab, asset === 'goals' && styles.assetTabActive]}
            onPress={() => {
              setAsset('goals');
              setSelection(null);
            }}
          >
            <Text style={[styles.assetLabel, asset === 'goals' && styles.assetLabelActive]}>
              ⚽ Goals ({matchState.homeScore + matchState.awayScore})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assetTab, asset === 'cards' && styles.assetTabActive]}
            onPress={() => {
              setAsset('cards');
              setSelection(null);
            }}
          >
            <Text style={[styles.assetLabel, asset === 'cards' && styles.assetLabelActive]}>
              🎴 Cards ({matchState.cards})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Interactive SVG Line Chart ─── */}
        <View style={styles.chartWrapper}>
          <View
            style={styles.svgContainer}
            onTouchStart={handleGraphTouch}
            onTouchMove={handleGraphTouch}
          >
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Defs>
                {/* HI zone green glow gradient */}
                <LinearGradient id="hiGlow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#00E676" stopOpacity="0.2" />
                  <Stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
                </LinearGradient>
                {/* LO zone red glow gradient */}
                <LinearGradient id="loGlow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FF1744" stopOpacity="0.0" />
                  <Stop offset="100%" stopColor="#FF1744" stopOpacity="0.2" />
                </LinearGradient>
              </Defs>

              {/* Horizontal Grid Lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const value = Math.round((i * maxVal) / 4);
                const y =
                  CHART_HEIGHT -
                  CHART_PADDING.bottom -
                  (value / maxVal) * plotHeight;
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
                      fontSize={10}
                      textAnchor="end"
                    >
                      {value}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Vertical Snapping Cells (5-minute lines in future zone) */}
              {Array.from({ length: 18 }).map((_, i) => {
                const cellMin = (i + 1) * 5;
                if (cellMin > matchState.minute) {
                  const x = CHART_PADDING.left + (cellMin / 90) * plotWidth;
                  return (
                    <Line
                      key={i}
                      x1={x}
                      y1={CHART_PADDING.top}
                      x2={x}
                      y2={CHART_HEIGHT - CHART_PADDING.bottom}
                      stroke="rgba(255,255,255,0.03)"
                      strokeDasharray="2, 4"
                      strokeWidth={1}
                    />
                  );
                }
                return null;
              })}

              {/* Shaded HI / LO Zones (if selection active) */}
              {selection && (
                <>
                  {/* HI (Green) overlay */}
                  <Rect
                    x={CHART_PADDING.left + (matchState.minute / 90) * plotWidth}
                    y={CHART_PADDING.top}
                    width={((selection.strikeMinute - matchState.minute) / 90) * plotWidth}
                    height={
                      CHART_HEIGHT -
                      CHART_PADDING.bottom -
                      CHART_PADDING.top -
                      (selection.strikeLevel / maxVal) * plotHeight
                    }
                    fill="url(#hiGlow)"
                  />
                  {/* LO (Red) overlay */}
                  <Rect
                    x={CHART_PADDING.left + (matchState.minute / 90) * plotWidth}
                    y={
                      CHART_HEIGHT -
                      CHART_PADDING.bottom -
                      (selection.strikeLevel / maxVal) * plotHeight
                    }
                    width={((selection.strikeMinute - matchState.minute) / 90) * plotWidth}
                    height={(selection.strikeLevel / maxVal) * plotHeight}
                    fill="url(#loGlow)"
                  />
                </>
              )}

              {/* Historical Stats Curve */}
              {stepPath !== '' && (
                <Path
                  d={stepPath}
                  fill="none"
                  stroke={THEME.colors.primary.DEFAULT}
                  strokeWidth={2}
                />
              )}

              {/* Live Minute Vertical Dotted Line */}
              {(() => {
                const x = CHART_PADDING.left + (matchState.minute / 90) * plotWidth;
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

              {/* Interactive Target crosshair */}
              {selection && (() => {
                const x = CHART_PADDING.left + (selection.strikeMinute / 90) * plotWidth;
                const y =
                  CHART_HEIGHT -
                  CHART_PADDING.bottom -
                  (selection.strikeLevel / maxVal) * plotHeight;
                return (
                  <>
                    {/* Horizontal dotted line to crosshair */}
                    <Line
                      x1={CHART_PADDING.left}
                      y1={y}
                      x2={x}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeDasharray="3, 3"
                      strokeWidth={1}
                    />
                    {/* Vertical dotted line to crosshair */}
                    <Line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={CHART_HEIGHT - CHART_PADDING.bottom}
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeDasharray="3, 3"
                      strokeWidth={1}
                    />
                    {/* Glow Target Point */}
                    <Circle cx={x} cy={y} r={8} fill="rgba(255,107,53,0.3)" />
                    <Circle cx={x} cy={y} r={4} fill="#FF6B35" />
                  </>
                );
              })()}

              {/* X-Axis labels */}
              <SvgText
                x={CHART_PADDING.left}
                y={CHART_HEIGHT - 6}
                fill="#8E8E93"
                fontSize={10}
                textAnchor="middle"
              >
                0'
              </SvgText>
              <SvgText
                x={CHART_PADDING.left + plotWidth / 2}
                y={CHART_HEIGHT - 6}
                fill="#8E8E93"
                fontSize={10}
                textAnchor="middle"
              >
                45'
              </SvgText>
              <SvgText
                x={chartWidth - CHART_PADDING.right}
                y={CHART_HEIGHT - 6}
                fill="#8E8E93"
                fontSize={10}
                textAnchor="middle"
              >
                90'
              </SvgText>
            </Svg>
          </View>
          <Text style={styles.chartHint}>
            Touch and drag in future zone to configure strike minute and target value
          </Text>
        </View>

        {/* ─── Control Sheet (Staking & Direction Selector) ─── */}
        {selection ? (
          <View style={styles.tradeSheet}>
            <Text style={styles.sheetTitle}>
              Target: {asset.toUpperCase()} @ Minute {selection.strikeMinute}
            </Text>
            <Text style={styles.sheetSubtitle}>
              Threshold Level: {selection.strikeLevel} (Current: {currentValue})
            </Text>

            {/* HI / LO choice options */}
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[
                  styles.choiceBtn,
                  styles.hiBtn,
                  tradeDirection === 'hi' && styles.choiceBtnActiveHI
                ]}
                onPress={() => setTradeDirection('hi')}
              >
                <Text style={styles.choiceLabel}>🟢 HI (Greater than {selection.strikeLevel})</Text>
                <Text style={styles.oddsText}>{odds.hi}x Return</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choiceBtn,
                  styles.loBtn,
                  tradeDirection === 'lo' && styles.choiceBtnActiveLO
                ]}
                onPress={() => setTradeDirection('lo')}
              >
                <Text style={styles.choiceLabel}>🔴 LO (Less than {selection.strikeLevel})</Text>
                <Text style={styles.oddsText}>{odds.lo}x Return</Text>
              </TouchableOpacity>
            </View>

            {/* Stake selector inputs */}
            <View style={styles.stakeRow}>
              <Text style={styles.stakeLabel}>SOL Stake:</Text>
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

            <TouchableOpacity style={styles.confirmTradeBtn} onPress={handleExecuteTrade}>
              <Text style={styles.confirmTradeTxt}>Lock Option Trade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inactiveSheet}>
            <Text style={styles.inactiveSheetTxt}>
              Select a target minute and value on the chart to place an option trade.
            </Text>
          </View>
        )}

        {/* ─── Active Options ledger ─── */}
        <View style={styles.ledgerSection}>
          <Text style={styles.ledgerHeader}>Open Positions ({positions.length})</Text>
          {positions.length === 0 ? (
            <Text style={styles.emptyLedger}>No active positions yet.</Text>
          ) : (
            positions.map((pos) => {
              const cashOutValue = getCashOutAmount(pos);
              let currentAssetVal = currentValue;
              if (pos.asset === 'goals') currentAssetVal = matchState.homeScore + matchState.awayScore;
              else if (pos.asset === 'cards') currentAssetVal = matchState.cards;

              const isITM = pos.direction === 'hi' ? currentAssetVal > pos.strikeLevel : currentAssetVal < pos.strikeLevel;
              const isPending = pos.status === 'pending';

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
                      <View
                        style={[
                          styles.statusBadge,
                          pos.status === 'won'
                            ? styles.wonBadge
                            : pos.status === 'cashed_out'
                            ? styles.cashBadge
                            : styles.lostBadge
                        ]}
                      >
                        <Text style={styles.badgeText}>{pos.status.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.posDetails}>
                    <Text style={styles.detailsLabel}>Strike Minute: Min {pos.strikeMinute}</Text>
                    <Text style={styles.detailsLabel}>Odds Locked: {pos.payout}x</Text>
                    <Text style={styles.detailsLabel}>Stake: {pos.stake} SOL</Text>
                  </View>

                  {isPending ? (
                    <View style={styles.cashOutRow}>
                      <Text style={styles.cashOutLabel}>
                        Est. Payout: {(pos.stake * pos.payout).toFixed(2)} SOL
                      </Text>
                      <TouchableOpacity
                        style={styles.cashOutBtn}
                        onPress={() => handleCashOut(pos)}
                      >
                        <Text style={styles.cashOutBtnTxt}>Cash Out: {cashOutValue} SOL</Text>
                      </TouchableOpacity>
                    </View>
                  ) : pos.status === 'cashed_out' ? (
                    <Text style={styles.settledTxt}>
                      Cashed out early for +{pos.cashOutAmount} SOL
                    </Text>
                  ) : pos.status === 'won' ? (
                    <Text style={[styles.settledTxt, { color: THEME.colors.yes }]}>
                      Won +{(pos.stake * pos.payout).toFixed(2)} SOL
                    </Text>
                  ) : (
                    <Text style={[styles.settledTxt, { color: THEME.colors.no }]}>
                      Settled as Lost (-{pos.stake} SOL)
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  particle: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 3,
    zIndex: 999
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.sm },
  backTxt: { color: THEME.colors.text.secondary, fontSize: 13, fontWeight: '600' },
  balancePill: { backgroundColor: THEME.colors.primary.glow, borderRadius: THEME.borderRadius.md, paddingVertical: 6, paddingHorizontal: 12 },
  balanceText: { color: THEME.colors.primary.DEFAULT, fontSize: 14, fontWeight: '700' },
  scrollContent: { paddingBottom: 40 },
  scoreboard: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20 },
  teamText: { color: THEME.colors.text.primary, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  scoreText: { color: THEME.colors.text.primary, fontSize: 24, fontWeight: '800', flex: 1, textAlign: 'center' },
  simControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 12 },
  timeText: { color: THEME.colors.primary.DEFAULT, fontSize: 14, fontWeight: '700', marginRight: 8 },
  controlPill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: THEME.borderRadius.sm },
  controlLabel: { color: THEME.colors.text.secondary, fontSize: 12, fontWeight: '600' },
  assetTabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 8 },
  assetTab: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.md, borderWidth: 1, borderColor: THEME.colors.border },
  assetTabActive: { borderColor: THEME.colors.primary.DEFAULT, backgroundColor: THEME.colors.primary.glow },
  assetLabel: { color: THEME.colors.text.secondary, fontSize: 11, fontWeight: '600' },
  assetLabelActive: { color: THEME.colors.primary.DEFAULT },
  chartWrapper: { marginHorizontal: 16, marginTop: 16, backgroundColor: THEME.colors.surface, borderRadius: THEME.borderRadius.lg, padding: 10, borderWidth: 1, borderColor: THEME.colors.border },
  svgContainer: { alignSelf: 'center', overflow: 'hidden' },
  chartHint: { color: THEME.colors.text.muted, fontSize: 9, textAlign: 'center', marginTop: 6 },
  tradeSheet: {
    backgroundColor: THEME.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  sheetTitle: { color: THEME.colors.text.primary, fontSize: 15, fontWeight: '700' },
  sheetSubtitle: { color: THEME.colors.text.secondary, fontSize: 12, marginTop: 4 },
  choiceRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  choiceBtn: { flex: 1, padding: 12, borderRadius: THEME.borderRadius.md, borderWidth: 1, borderColor: THEME.colors.border, alignItems: 'center' },
  hiBtn: { backgroundColor: 'rgba(0, 230, 118, 0.05)' },
  loBtn: { backgroundColor: 'rgba(255, 23, 68, 0.05)' },
  choiceBtnActiveHI: { borderColor: THEME.colors.yes, backgroundColor: 'rgba(0, 230, 118, 0.15)' },
  choiceBtnActiveLO: { borderColor: THEME.colors.no, backgroundColor: 'rgba(255, 23, 68, 0.15)' },
  choiceLabel: { color: THEME.colors.text.primary, fontSize: 11, fontWeight: '700' },
  oddsText: { color: THEME.colors.text.secondary, fontSize: 14, fontWeight: '700', marginTop: 4 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  stakeLabel: { color: THEME.colors.text.secondary, fontSize: 13, fontWeight: '600' },
  presets: { flex: 1 },
  presetBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: THEME.borderRadius.sm, marginRight: 6, borderWidth: 1, borderColor: THEME.colors.border },
  presetBtnActive: { backgroundColor: THEME.colors.primary.DEFAULT, borderColor: THEME.colors.primary.DEFAULT },
  presetTxt: { color: THEME.colors.text.secondary, fontSize: 11, fontWeight: '600' },
  presetTxtActive: { color: THEME.colors.background },
  confirmTradeBtn: { backgroundColor: THEME.colors.primary.DEFAULT, paddingVertical: 12, borderRadius: THEME.borderRadius.md, alignItems: 'center', marginTop: 16 },
  confirmTradeTxt: { color: THEME.colors.background, fontSize: 15, fontWeight: '700' },
  inactiveSheet: {
    backgroundColor: THEME.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center'
  },
  inactiveSheetTxt: { color: THEME.colors.text.muted, fontSize: 12, textAlign: 'center' },
  ledgerSection: { marginHorizontal: 16, marginTop: 24 },
  ledgerHeader: { color: THEME.colors.text.primary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyLedger: { color: THEME.colors.text.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  positionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  posHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  posTitle: { color: THEME.colors.text.primary, fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 100 },
  badgeText: { color: THEME.colors.background, fontSize: 10, fontWeight: '700' },
  itmBadge: { backgroundColor: THEME.colors.yes },
  otmBadge: { backgroundColor: THEME.colors.no },
  wonBadge: { backgroundColor: THEME.colors.yes },
  lostBadge: { backgroundColor: THEME.colors.no },
  cashBadge: { backgroundColor: '#FFD54F' },
  posDetails: { flexDirection: 'row', gap: 12, marginTop: 8 },
  detailsLabel: { color: THEME.colors.text.secondary, fontSize: 11 },
  cashOutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  cashOutLabel: { color: THEME.colors.text.secondary, fontSize: 12, fontWeight: '600' },
  cashOutBtn: { backgroundColor: THEME.colors.primary.DEFAULT, paddingVertical: 6, paddingHorizontal: 12, borderRadius: THEME.borderRadius.sm },
  cashOutBtnTxt: { color: THEME.colors.background, fontSize: 11, fontWeight: '700' },
  settledTxt: { color: THEME.colors.text.muted, fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' }
});
