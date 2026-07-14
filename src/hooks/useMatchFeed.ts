import { useState, useEffect, useCallback } from 'react';
import { Match, Market, MarketType } from '../types';
import { txoddsService } from '../services/txodds';

export function useMatchFeed() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketType, setSelectedMarketType] = useState<MarketType>('NEXT_GOAL_TIMER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch fixtures (waits for auth to be ready) ──────────────────
  const refreshMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await txoddsService.getFixtures();

      // Sort: chronological order (earliest kick-offs first)
      const sorted = [...fetched].sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      setMatches(sorted);
    } catch (err: any) {
      console.error('Failed to fetch matches:', err);
      setError(err?.message || 'Failed to load matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  // ── Fetch markets when a match is selected ───────────────────────
  const selectMatch = useCallback(async (match: Match) => {
    setSelectedMatch(match);
    setMarkets([]);
    try {
      const fetched = await txoddsService.getOdds(match.id);
      setMarkets(fetched);
      if (fetched.length > 0) {
        setSelectedMarketType(fetched[0].type);
      }
    } catch (err) {
      console.warn(`Failed to fetch odds for match ${match.id}:`, err);
      setMarkets([]);
    }
  }, []);

  const selectMarketType = useCallback((type: MarketType) => {
    setSelectedMarketType(type);
  }, []);

  // Auto-select first match when data loads
  useEffect(() => {
    if (matches.length > 0 && !selectedMatch) {
      selectMatch(matches[0]);
    }
  }, [matches, selectedMatch, selectMatch]);

  const currentMarket =
    markets.find((m) => m.type === selectedMarketType) || markets[0] || null;

  return {
    matches,
    selectedMatch,
    selectedMarketType,
    markets,
    currentMarket,
    loading,
    error,
    selectMatch,
    selectMarketType,
    refreshMatches,
  };
}

