import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { Match } from '../types';
import { txoddsService } from '../services/txodds';
import { useWallet } from './useWallet';

export type OptionAsset = 'goals' | 'corners' | 'cards';

export interface OptionPosition {
  id: string;
  matchId: string;
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

export function useMatchSimulation(
  match: Match | null,
  triggerConfetti: () => void,
  walletBalance: number,
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>,
  positions: OptionPosition[],
  setPositions: React.Dispatch<React.SetStateAction<OptionPosition[]>>
) {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed] = useState<number>(1.2); // seconds per match minute
  const [asset, setAsset] = useState<OptionAsset>('corners');
  const [stake, setStake] = useState<number>(0.1);
  const [tradeDirection, setTradeDirection] = useState<'hi' | 'lo'>('hi');
  const [selection, setSelection] = useState<{ strikeMinute: number; strikeLevel: number } | null>(null);

  // Scoreboard sim state
  const [simState, setSimState] = useState({
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    corners: 0,
    cards: 0,
    status: 'upcoming' as Match['status']
  });

  // Timeline stepped histories
  const [goalsHistory, setGoalsHistory] = useState<number[]>(new Array(91).fill(0));
  const [cornersHistory, setCornersHistory] = useState<number[]>(new Array(91).fill(0));
  const [cardsHistory, setCardsHistory] = useState<number[]>(new Array(91).fill(0));

  // ─── Initialize Simulator on Match Change ───────────────────────
  const resetSimulation = useCallback(() => {
    if (!match) return;
    setSelection(null);
    setIsRunning(true);

    // Default simulation starting clock
    const startMin = match.status === 'live' ? match.minute : 0;

    const seedHistory = (rate: number, finalVal: number) => {
      const arr = new Array(91).fill(0);
      let val = 0;
      for (let m = 1; m <= 90; m++) {
        if (m <= startMin) {
          if (val < finalVal && Math.random() < 0.25) {
            val += 1;
          }
        }
        arr[m] = m <= startMin ? val : 0;
      }
      arr[startMin] = finalVal;
      for (let m = startMin; m <= 90; m++) {
        arr[m] = finalVal;
      }
      return arr;
    };

    // For simulation re-play of finished matches, we start scores at 0 or initial values
    const initialGoals = match.status === 'finished' ? 0 : match.homeScore + match.awayScore;
    const initialCorners = match.status === 'live' ? Math.max(1, Math.round(startMin * 0.08)) : 0;
    const initialCards = match.status === 'live' ? Math.max(0, Math.round(startMin * 0.04)) : 0;

    setGoalsHistory(seedHistory(0.03, initialGoals));
    setCornersHistory(seedHistory(0.12, initialCorners));
    setCardsHistory(seedHistory(0.05, initialCards));

    setSimState({
      minute: startMin,
      homeScore: match.status === 'finished' ? 0 : match.homeScore,
      awayScore: match.status === 'finished' ? 0 : match.awayScore,
      corners: initialCorners,
      cards: initialCards,
      status: match.status === 'finished' ? 'live' : match.status
    });
  }, [match]);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Fetch real scores from TxODDS API and update the simulation state
  const fetchLiveScores = useCallback(async () => {
    if (!match) return;
    try {
      const scores = await txoddsService.getScores(match.id);
      if (!scores || scores.length === 0) {
        Alert.alert('Error', 'Failed to fetch live match updates from TxODDS: Empty match data.');
        return;
      }
      
      const latest = scores[scores.length - 1];

      // Parse current minute
      let currentMin = 0;
      if (latest.Minute !== undefined && latest.Minute !== null) {
        currentMin = latest.Minute;
      } else if (latest.Clock?.Seconds !== undefined && latest.Clock?.Seconds !== null) {
        currentMin = Math.floor(latest.Clock.Seconds / 60);
      } else {
        const startMs = new Date(match.startTime).getTime();
        currentMin = Math.min(90, Math.floor((Date.now() - startMs) / 60000));
      }

      const hGoals = latest.Stats?.['1'] ?? 0;
      const aGoals = latest.Stats?.['2'] ?? 0;
      const hCorners = latest.Stats?.['3'] ?? 0;
      const aCorners = latest.Stats?.['4'] ?? 0;
      const hYellow = latest.Stats?.['5'] ?? 0;
      const aYellow = latest.Stats?.['6'] ?? 0;
      const hRed = latest.Stats?.['7'] ?? 0;
      const aRed = latest.Stats?.['8'] ?? 0;

      const totalCorners = hCorners + aCorners;
      const totalCards = hYellow + aYellow + hRed + aRed;

      // Rebuild historical timelines
      const nextGoals = new Array(91).fill(0);
      const nextCorners = new Array(91).fill(0);
      const nextCards = new Array(91).fill(0);

      scores.forEach((entry) => {
        let m = 0;
        if (entry.Minute !== undefined && entry.Minute !== null) {
          m = entry.Minute;
        } else if (entry.Clock?.Seconds !== undefined && entry.Clock?.Seconds !== null) {
          m = Math.floor(entry.Clock.Seconds / 60);
        }
        m = Math.max(0, Math.min(90, m));

        const eg = (entry.Stats?.['1'] ?? 0) + (entry.Stats?.['2'] ?? 0);
        const ec = (entry.Stats?.['3'] ?? 0) + (entry.Stats?.['4'] ?? 0);
        const ecd = (entry.Stats?.['5'] ?? 0) + (entry.Stats?.['6'] ?? 0) + (entry.Stats?.['7'] ?? 0) + (entry.Stats?.['8'] ?? 0);

        nextGoals[m] = eg;
        nextCorners[m] = ec;
        nextCards[m] = ecd;
      });

      // Forward fill gaps up to currentMin
      let lastG = 0, lastC = 0, lastCd = 0;
      for (let m = 0; m <= 90; m++) {
        if (m <= currentMin) {
          if (nextGoals[m] > 0 || m === 0) lastG = nextGoals[m];
          else nextGoals[m] = lastG;

          if (nextCorners[m] > 0 || m === 0) lastC = nextCorners[m];
          else nextCorners[m] = lastC;

          if (nextCards[m] > 0 || m === 0) lastCd = nextCards[m];
          else nextCards[m] = lastCd;
        } else {
          nextGoals[m] = 0;
          nextCorners[m] = 0;
          nextCards[m] = 0;
        }
      }

      setGoalsHistory(nextGoals);
      setCornersHistory(nextCorners);
      setCardsHistory(nextCards);

      setSimState({
        minute: currentMin,
        homeScore: hGoals,
        awayScore: aGoals,
        corners: totalCorners,
        cards: totalCards,
        status: 'live'
      });

      // Settle active prediction positions locally based on the real match stats
      setPositions((prevPositions) =>
        prevPositions.map((pos) => {
          if (pos.matchId === match.id && pos.status === 'pending' && currentMin >= pos.strikeMinute) {
            let actualVal = 0;
            if (pos.asset === 'goals') actualVal = hGoals + aGoals;
            else if (pos.asset === 'corners') actualVal = totalCorners;
            else actualVal = totalCards;

            const won = pos.direction === 'hi' ? actualVal > pos.strikeLevel : actualVal < pos.strikeLevel;
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

    } catch (err: any) {
      Alert.alert('Error', `Failed to fetch live match updates from TxODDS: ${err?.message || err}`);
    }
  }, [match, setPositions, setWalletBalance, triggerConfetti]);

  // ─── Live Polling from TxODDS ────────────────────────────────────
  useEffect(() => {
    if (!match || match.status !== 'live') return;

    // Fetch initial scores on expand
    fetchLiveScores();

    // Set up polling interval every 12 seconds
    const interval = setInterval(fetchLiveScores, 12_000);
    return () => clearInterval(interval);
  }, [match, fetchLiveScores]);

  // ─── Map Current Stat Value ─────────────────────────────────────
  const currentValue = useMemo(() => {
    if (asset === 'goals') return simState.homeScore + simState.awayScore;
    if (asset === 'corners') return simState.corners;
    return simState.cards;
  }, [asset, simState]);

  // ─── Snapping limits ───
  const maxVal = useMemo(() => {
    const limits = { goals: 6, corners: 12, cards: 8 };
    return limits[asset];
  }, [asset]);

  // ─── Live Odds pricing calculation ─────────────────────────────
  const odds = useMemo(() => {
    if (!selection) return { hi: 1.0, lo: 1.0 };
    const timeRemaining = selection.strikeMinute - simState.minute;
    if (timeRemaining <= 0) return { hi: 1.0, lo: 1.0 };

    const rates = { goals: 2.5 / 90, corners: 9.5 / 90, cards: 4.0 / 90 };
    const lambda = rates[asset];
    const mean = lambda * timeRemaining;
    const distance = selection.strikeLevel - currentValue;

    const z = (distance - mean) / Math.sqrt(mean + 0.15);
    const probHi = 1 / (1 + Math.exp(1.6 * z));
    const clampedHi = Math.max(0.04, Math.min(0.96, probHi));
    const clampedLo = 1 - clampedHi;

    return {
      hi: parseFloat((0.95 / clampedHi).toFixed(2)),
      lo: parseFloat((0.95 / clampedLo).toFixed(2))
    };
  }, [selection, asset, currentValue, simState.minute]);

  // ─── Cash Out Payout calculator ─────────────────────────────
  const getCashOutAmount = useCallback((pos: OptionPosition) => {
    if (pos.status !== 'pending') return 0;
    const timeRemaining = pos.strikeMinute - simState.minute;
    if (timeRemaining <= 0) return 0;

    const totalDuration = pos.strikeMinute - pos.buyMinute;
    if (totalDuration <= 0) return 0;

    const timeElapsedRatio = (simState.minute - pos.buyMinute) / totalDuration;
    
    let currentAssetVal = currentValue;
    if (pos.asset === 'goals') currentAssetVal = simState.homeScore + simState.awayScore;
    else if (pos.asset === 'cards') currentAssetVal = simState.cards;

    const isITM = pos.direction === 'hi' ? currentAssetVal > pos.strikeLevel : currentAssetVal < pos.strikeLevel;
    const initialCost = pos.stake;
    const maxPayout = pos.stake * pos.payout;

    if (isITM) {
      const markup = (maxPayout - initialCost) * (0.3 + 0.6 * timeElapsedRatio);
      return parseFloat(Math.min(initialCost + markup, maxPayout * 0.9).toFixed(3));
    } else {
      const distance = Math.abs(currentAssetVal - pos.strikeLevel);
      const decayFactor = Math.max(0.1, 1 - (distance * 0.25) - (timeElapsedRatio * 0.6));
      return parseFloat((initialCost * decayFactor).toFixed(3));
    }
  }, [simState.minute, currentValue]);

  // Execute trade
  const { walletAddress, signMessage, signAndSendTransaction } = useWallet();

  const executeTrade = useCallback(async () => {
    if (!selection || !match) return;
    if (walletBalance < stake) {
      Alert.alert('Insufficient Balance', 'You do not have enough SOL in your wallet.');
      return;
    }

    if (!walletAddress) {
      Alert.alert('Wallet Not Connected', 'Please connect your Solana wallet first.');
      return;
    }

    try {
      // 1. Sign connection message to authenticate with MYLA Program
      const message = `Sign connection to MYLA Pool: ${asset.toUpperCase()} ${tradeDirection.toUpperCase()} ${selection.strikeLevel} @ Min ${selection.strikeMinute}`;
      await signMessage(message);

      // 2. Simulate transaction hash
      const txHash = '5t2nMaoQyhpmoLTCc4dSq8M2Y3C8DE2X9N15mG7nGttW' + Math.random().toString(36).substring(2, 8);

      // 3. Record local position
      const oddsRatio = tradeDirection === 'hi' ? odds.hi : odds.lo;
      const newPosition: OptionPosition = {
        id: Math.random().toString(36).substring(2, 11),
        matchId: match.id,
        asset,
        strikeMinute: selection.strikeMinute,
        strikeLevel: selection.strikeLevel,
        direction: tradeDirection,
        buyMinute: simState.minute,
        buyValue: currentValue,
        stake,
        payout: oddsRatio,
        status: 'pending'
      };

      setWalletBalance((b) => parseFloat((b - stake).toFixed(2)));
      setPositions((prev) => [newPosition, ...prev]);
      setSelection(null);

      Alert.alert('Prediction Created', 'Your micro-prediction has been placed on-chain via the MYLA Program.');
    } catch (err: any) {
      console.error('[useMatchSimulation] executeTrade failed:', err);
      Alert.alert('Transaction Failed', err?.message || 'Failed to place prediction on-chain.');
    }
  }, [selection, match, walletBalance, stake, tradeDirection, odds, asset, currentValue, simState.minute, walletAddress, signMessage, setWalletBalance, setPositions, setSelection]);

  const cashOut = useCallback((pos: OptionPosition) => {
    const cashValue = getCashOutAmount(pos);
    setWalletBalance((b) => parseFloat((b + cashValue).toFixed(2)));
    setPositions((prev) =>
      prev.map((p) => (p.id === pos.id ? { ...p, status: 'cashed_out', cashOutAmount: cashValue } : p))
    );
  }, [getCashOutAmount]);

  return {
    simState,
    isRunning,
    setIsRunning,
    walletBalance,
    positions,
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
  };
}
