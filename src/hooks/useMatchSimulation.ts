import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { Match } from '../types';
import { txoddsService } from '../services/txodds';
import { useWallet } from './useWallet';
import { Connection, PublicKey } from '@solana/web3.js';
import { buildAtomicBetTransaction } from '../services/pool-program';
import { CONFIG } from '../config';

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

export function useMatchContext(
  match: Match | null,
  triggerConfetti: () => void,
  walletBalance: number,
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>,
  positions: OptionPosition[],
  setPositions: React.Dispatch<React.SetStateAction<OptionPosition[]>>
) {
  const [asset, setAsset] = useState<OptionAsset>('corners');
  const [stake, setStake] = useState<number>(0.1);
  const [tradeDirection, setTradeDirection] = useState<'hi' | 'lo'>('hi');
  const [selection, setSelection] = useState<{ strikeMinute: number; strikeLevel: number } | null>(null);
  const [isTrading, setIsTrading] = useState(false);

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

    // Default simulation starting clock
    const startMin = match.status === 'live' ? match.minute : (match.status === 'finished' ? 90 : 0);

    const nextGoals = new Array(91).fill(0);
    const initialGoals = match.homeScore + match.awayScore;
    for (let m = startMin; m <= 90; m++) {
      nextGoals[m] = initialGoals;
    }

    setGoalsHistory(nextGoals);
    setCornersHistory(new Array(91).fill(0));
    setCardsHistory(new Array(91).fill(0));

    setSimState({
      minute: startMin,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      corners: 0,
      cards: 0,
      status: match.status
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
      const latest = (scores && scores.length > 0) ? scores[scores.length - 1] : null;

      // Parse current minute
      let currentMin = 0;
      if (match.status === 'finished') {
        currentMin = 90;
      } else if (latest && latest.Minute !== undefined && latest.Minute !== null) {
        currentMin = latest.Minute;
      } else if (latest && latest.Clock?.Seconds !== undefined && latest.Clock?.Seconds !== null) {
        currentMin = Math.floor(latest.Clock.Seconds / 60);
      } else {
        const startMs = new Date(match.startTime).getTime();
        currentMin = Math.min(90, Math.max(0, Math.floor((Date.now() - startMs) / 60000)));
      }

      const hGoals = latest?.Stats?.['1'] ?? 0;
      const aGoals = latest?.Stats?.['2'] ?? 0;
      const hCorners = latest?.Stats?.['3'] ?? 0;
      const aCorners = latest?.Stats?.['4'] ?? 0;
      const hYellow = latest?.Stats?.['5'] ?? 0;
      const aYellow = latest?.Stats?.['6'] ?? 0;
      const hRed = latest?.Stats?.['7'] ?? 0;
      const aRed = latest?.Stats?.['8'] ?? 0;

      const totalCorners = hCorners + aCorners;
      const totalCards = hYellow + aYellow + hRed + aRed;

      // Rebuild historical timelines
      const nextGoals = new Array(91).fill(0);
      const nextCorners = new Array(91).fill(0);
      const nextCards = new Array(91).fill(0);

      if (scores && scores.length > 0) {
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
      }

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
        status: match.status
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
      console.warn('[useMatchContext] Failed to fetch live match updates from TxODDS:', err?.message || err);
    }
  }, [match, setPositions, setWalletBalance, triggerConfetti]);

  // ─── Live Polling from TxODDS (Only for Real Live/Finished Matches) ───────────
  useEffect(() => {
    if (!match) return;
    if (match.status !== 'live' && match.status !== 'finished') return;

    // Fetch initial scores on expand
    fetchLiveScores();

    // Set up polling interval every 12 seconds only for live matches
    if (match.status === 'live') {
      const interval = setInterval(fetchLiveScores, 12_000);
      return () => clearInterval(interval);
    }
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
  const { walletAddress, signAndSendTransaction } = useWallet();

  const executeTrade = useCallback(async () => {
    if (!selection || !match) return;
    if (walletBalance < stake) {
      Alert.alert('Insufficient Balance', 'You do not have enough SOL in your wallet.');
      return;
    }

    if (!walletAddress || walletAddress.startsWith('DevWallet')) {
      Alert.alert('Wallet Not Connected', 'Please connect your Solana wallet first.');
      return;
    }

    setIsTrading(true);
    try {
      // Real Solana Devnet MWA Flow
      const userPubkey = new PublicKey(walletAddress);
      const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');

      // Side: 0 = Over, 1 = Under
      const side = tradeDirection === 'hi' ? 0 : 1;
      const amountLamports = Math.round(stake * 1e9);
      const scaledStrikeLevel = Math.round(selection.strikeLevel * 10);
      const deadline = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now

      console.log(`[useMatchContext] Building atomic transaction:
        User: ${userPubkey.toBase58()}
        Match: ${match.id}
        Asset: ${asset}
        Strike Level: ${scaledStrikeLevel}
        Strike Minute: ${selection.strikeMinute}
        Side: ${side}
        Amount (Lamports): ${amountLamports}
        Deadline: ${deadline}`);

      const transaction = await buildAtomicBetTransaction(
        connection,
        userPubkey,
        match.id,
        asset,
        scaledStrikeLevel,
        selection.strikeMinute,
        deadline,
        side,
        amountLamports
      );

      // Serialize the built transaction to base64
      const serializedTx = transaction.serialize({ requireAllSignatures: false });
      const txBase64 = serializedTx.toString('base64');

      console.log('[useMatchContext] Sending transaction to Mobile Wallet Adapter...');
      const txSig = await signAndSendTransaction(txBase64);
      console.log('[useMatchContext] Transaction signature returned:', txSig);

      // Record local position
      const oddsRatio = tradeDirection === 'hi' ? odds.hi : odds.lo;
      const newPosition: OptionPosition = {
        id: txSig,
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

      // Refresh balance from blockchain
      try {
        const balanceLamports = await connection.getBalance(userPubkey);
        setWalletBalance(balanceLamports / 1e9);
      } catch (balErr) {
        console.warn('Failed to refresh on-chain balance:', balErr);
        setWalletBalance((b) => parseFloat((b - stake).toFixed(2)));
      }

      setPositions((prev) => [newPosition, ...prev]);
      setSelection(null);

      Alert.alert(
        'Prediction Created',
        `Your prediction has been successfully placed on-chain!\n\nSignature: ${txSig.substring(0, 12)}...`,
        [
          { text: 'OK' }
        ]
      );
    } catch (err: any) {
      console.error('[useMatchContext] executeTrade failed:', err);
      Alert.alert('Transaction Failed', err?.message || 'Failed to place prediction on-chain.');
    } finally {
      setIsTrading(false);
    }
  }, [selection, match, walletBalance, stake, tradeDirection, odds, asset, currentValue, simState.minute, walletAddress, setWalletBalance, setPositions, setSelection, signAndSendTransaction]);

  const cashOut = useCallback((pos: OptionPosition) => {
    const cashValue = getCashOutAmount(pos);
    setWalletBalance((b) => parseFloat((b + cashValue).toFixed(2)));
    setPositions((prev) =>
      prev.map((p) => (p.id === pos.id ? { ...p, status: 'cashed_out', cashOutAmount: cashValue } : p))
    );
  }, [getCashOutAmount]);

  return {
    simState,
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
    isTrading,
    cashOut,
    getCashOutAmount,
    resetSimulation
  };
}
