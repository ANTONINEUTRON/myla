import { useState, useEffect, useMemo, useCallback } from 'react';
import { Match } from '../types';

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

  // ─── Timer Tick Loop ─────────────────────────────────────────────
  useEffect(() => {
    let timer: any;
    if (isRunning && match && simState.status === 'live') {
      timer = setInterval(() => {
        setSimState((prev) => {
          if (prev.minute >= 90) {
            setIsRunning(false);
            return { ...prev, status: 'finished' };
          }

          const nextMin = prev.minute + 1;
          let newHome = prev.homeScore;
          let newAway = prev.awayScore;
          let newCorners = prev.corners;
          let newCards = prev.cards;

          const nextGoals = [...goalsHistory];
          const nextCorners = [...cornersHistory];
          const nextCards = [...cardsHistory];

          if (Math.random() < 0.12) newCorners += 1;
          nextCorners[nextMin] = newCorners;
          for (let i = nextMin + 1; i <= 90; i++) nextCorners[i] = newCorners;
          setCornersHistory(nextCorners);

          if (Math.random() < 0.05) newCards += 1;
          nextCards[nextMin] = newCards;
          for (let i = nextMin + 1; i <= 90; i++) nextCards[i] = newCards;
          setCardsHistory(nextCards);

          if (Math.random() < 0.03) {
            if (Math.random() > 0.5) newHome += 1;
            else newAway += 1;
          }
          const totalGoals = newHome + newAway;
          nextGoals[nextMin] = totalGoals;
          for (let i = nextMin + 1; i <= 90; i++) nextGoals[i] = totalGoals;
          setGoalsHistory(nextGoals);

          // Settle positions
          setPositions((prevPositions) =>
            prevPositions.map((pos) => {
              if (pos.matchId === match.id && pos.status === 'pending' && nextMin >= pos.strikeMinute) {
                let actualVal = 0;
                if (pos.asset === 'goals') actualVal = totalGoals;
                else if (pos.asset === 'corners') actualVal = newCorners;
                else actualVal = newCards;

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
  }, [isRunning, match, simState.status, goalsHistory, cornersHistory, cardsHistory, simSpeed, triggerConfetti]);

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
  const executeTrade = useCallback(() => {
    if (!selection || !match) return;
    if (walletBalance < stake) {
      alert('Insufficient Balance');
      return;
    }

    const oddsRatio = tradeDirection === 'hi' ? odds.hi : odds.lo;
    const newPosition: OptionPosition = {
      id: Math.random().toString(36).substr(2, 9),
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
  }, [selection, match, walletBalance, stake, tradeDirection, odds, asset, currentValue, simState.minute]);

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
