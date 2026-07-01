import { useState, useEffect, useCallback } from 'react';
import { Match, Market } from '../types';

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

export function useMatchFeed() {
  const [matches, setMatches] = useState<Match[]>(MOCK_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);

  const selectMatch = useCallback((match: Match) => {
    setSelectedMatch(match);
    // TODO: Fetch markets for this match from backend
  }, []);

  const refreshMatches = useCallback(async () => {
    setLoading(true);
    // TODO: Fetch live matches from TxODDS
    setLoading(false);
  }, []);

  return {
    matches,
    selectedMatch,
    markets,
    loading,
    selectMatch,
    refreshMatches,
  };
}
