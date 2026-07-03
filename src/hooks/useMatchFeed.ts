import { useState, useEffect, useCallback } from 'react';
import { Match, Market, MarketType } from '../types';

// Mock data for development
const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    homeTeam: 'Brazil',
    awayTeam: 'Croatia',
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    status: 'live',
    startTime: '2026-06-30T18:00:00Z',
  },
  {
    id: '2',
    homeTeam: 'France',
    awayTeam: 'Senegal',
    homeScore: 0,
    awayScore: 0,
    minute: 23,
    status: 'live',
    startTime: '2026-06-30T20:00:00Z',
  },
  {
    id: '3',
    homeTeam: 'Argentina',
    awayTeam: 'Japan',
    homeScore: 0,
    awayScore: 0,
    minute: 0,
    status: 'upcoming',
    startTime: '2026-07-01T16:00:00Z',
  },
];

const MOCK_MARKETS: Record<string, Market[]> = {
  '1': [
    {
      id: 'm1',
      matchId: '1',
      type: 'NEXT_GOAL_TIMER',
      question: 'Will a goal be scored in the next 15 minutes?',
      outcomes: [
        { id: 'yes-1', label: 'YES', odds: 35 },
        { id: 'no-1', label: 'NO', odds: 65 },
      ],
      status: 'open',
      stakePool: 12.5,
      timeRemaining: 840,
      opensAt: '2026-06-30T18:00:00Z',
      closesAt: '2026-06-30T18:15:00Z',
    },
    {
      id: 'm2',
      matchId: '1',
      type: 'NEXT_CORNER',
      question: 'Will Brazil win the next corner?',
      outcomes: [
        { id: 'yes-2', label: 'YES', odds: 52 },
        { id: 'no-2', label: 'NO', odds: 48 },
      ],
      status: 'open',
      stakePool: 8.2,
      timeRemaining: 600,
      opensAt: '2026-06-30T18:00:00Z',
      closesAt: '2026-06-30T18:10:00Z',
    },
  ],
  '2': [
    {
      id: 'm3',
      matchId: '2',
      type: 'NEXT_GOAL_TIMER',
      question: 'Will a goal be scored in the next 15 minutes?',
      outcomes: [
        { id: 'yes-3', label: 'YES', odds: 45 },
        { id: 'no-3', label: 'NO', odds: 55 },
      ],
      status: 'open',
      stakePool: 5.1,
      timeRemaining: 1020,
      opensAt: '2026-06-30T20:00:00Z',
      closesAt: '2026-06-30T20:15:00Z',
    },
  ],
  '3': [],
};

// Repeat mock data 3 times for circular scrolling feel
const CIRCULAR_MATCHES = [...MOCK_MATCHES, ...MOCK_MATCHES, ...MOCK_MATCHES];

export function useMatchFeed() {
  const [matches, setMatches] = useState<Match[]>(CIRCULAR_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketType, setSelectedMarketType] = useState<MarketType>('NEXT_GOAL_TIMER');
  const [loading, setLoading] = useState(false);

  const selectMatch = useCallback((match: Match) => {
    setSelectedMatch(match);
    const matchMarkets = MOCK_MARKETS[match.id] || [];
    setMarkets(matchMarkets);
    if (matchMarkets.length > 0) {
      setSelectedMarketType(matchMarkets[0].type);
    }
  }, []);

  const selectMarketType = useCallback((type: MarketType) => {
    setSelectedMarketType(type);
  }, []);

  const refreshMatches = useCallback(async () => {
    setLoading(true);
    // TODO: Fetch live matches from TxODDS
    setLoading(false);
  }, []);

  // Auto-select first match
  useEffect(() => {
    if (matches.length > 0 && !selectedMatch) {
      selectMatch(matches[0]);
    }
  }, [matches, selectedMatch, selectMatch]);

  const currentMarket = markets.find((m) => m.type === selectedMarketType) || markets[0] || null;

  return {
    matches,
    selectedMatch,
    selectedMarketType,
    markets,
    currentMarket,
    loading,
    selectMatch,
    selectMarketType,
    refreshMatches,
  };
}
