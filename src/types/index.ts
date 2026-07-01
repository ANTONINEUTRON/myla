// Market Types
export type MarketStatus = 'created' | 'open' | 'locked' | 'resolved' | 'settled' | 'expired';

export type MarketType =
  | 'NEXT_GOAL_TIMER'
  | 'NEXT_CORNER'
  | 'NEXT_CARD'
  | 'GOALS_OVER_UNDER'
  | 'NEXT_SUBSTITUTION'
  | 'PLAYER_NEXT_GOAL';

export interface MarketOutcome {
  id: string;
  label: string;
  odds: number; // 0-100 percentage
}

export interface Market {
  id: string;
  matchId: string;
  type: MarketType;
  question: string;
  outcomes: MarketOutcome[];
  status: MarketStatus;
  stakePool: number; // Total SOL staked
  timeRemaining: number; // seconds
  opensAt: string; // ISO timestamp
  closesAt: string; // ISO timestamp
  resolvedAt?: string;
  winningOutcomeId?: string;
}

// Match Types
export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'upcoming' | 'live' | 'finished';
  startTime: string;
}

// Prediction Types
export interface Prediction {
  id: string;
  marketId: string;
  userId: string;
  outcomeId: string;
  stakeAmount: number; // SOL
  status: 'pending' | 'won' | 'lost' | 'voided';
  payout?: number;
}

// User Types
export interface UserProfile {
  walletAddress: string;
  username?: string;
  totalEarnings: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  bestStreak: number;
}

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  MatchDetails: { matchId: string };
  Wallet: undefined;
  Profile: undefined;
  Leaderboard: undefined;
};
