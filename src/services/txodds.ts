/**
 * TxODDS API Service — Fixed for Phase 6.5
 *
 * Fixes:
 *  1. baseURL was `.../api` with paths also using `/api/...` → double prefix bug
 *  2. Service was never configured (no credentials → always returned [])
 *  3. Added auto guest-session initialization (no credentials needed for free tier)
 *  4. Returns empty arrays when API is unavailable/not activated
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TxFixture,
  TxOddsEntry,
  TxScoreEntry,
  TxGamePhase,
} from '../types/txodds';
import { Match, Market, MarketType } from '../types';

/** Base origin (no /api suffix — paths include /api/... themselves) */
const ORIGIN_MAINNET = 'https://txline.txodds.com';
const ORIGIN_DEVNET = 'https://txline-dev.txodds.com';

const STORAGE_KEY_JWT = '@myla/txodds_jwt';
const STORAGE_KEY_TOKEN = '@myla/txodds_api_token';

// ─── Helpers ─────────────────────────────────────────────────────

const GAME_PHASE_MAP: Record<TxGamePhase, Match['status']> = {
  1: 'upcoming',   // NS
  2: 'live',       // H1
  3: 'live',       // HT
  4: 'live',       // H2
  5: 'finished',   // F
  6: 'live',       // WET
  7: 'live',       // ET1
  8: 'live',       // HTET
  9: 'live',       // ET2
  10: 'finished',  // FET
  11: 'live',      // WPE
  12: 'live',      // PE
  13: 'finished',  // FPE
  14: 'live',      // I
  15: 'finished',  // A
  16: 'finished',  // C
  19: 'upcoming',  // P
};

/** Map a TxFixture to our internal Match type. */
function fixtureToMatch(f: TxFixture, scores?: TxScoreEntry[]): Match {
  const homeTeam = f.Participant1IsHome ? f.Participant1 : f.Participant2;
  const awayTeam = f.Participant1IsHome ? f.Participant2 : f.Participant1;

  let startTimeVal: any = f.StartTime;
  if (typeof startTimeVal === 'number') {
    startTimeVal = startTimeVal < 10000000000 ? startTimeVal * 1000 : startTimeVal;
  } else if (typeof startTimeVal === 'string') {
    if (/^\d+$/.test(startTimeVal)) {
      const valNum = parseInt(startTimeVal, 10);
      startTimeVal = valNum < 10000000000 ? valNum * 1000 : valNum;
    } else {
      if (!startTimeVal.endsWith('Z') && !startTimeVal.includes('+') && !startTimeVal.includes('-')) {
        startTimeVal = startTimeVal.includes('T') ? `${startTimeVal}Z` : `${startTimeVal.replace(' ', 'T')}Z`;
      }
    }
  }
  const startMs = new Date(startTimeVal).getTime();
  const startTimeISO = new Date(startTimeVal).toISOString();
  const nowMs = Date.now();

  let status: Match['status'] = 'upcoming';
  let minute = 0;
  let homeScore = 0;
  let awayScore = 0;

  // Enforce strict time-based categorization to prevent stale feed statuses
  if (nowMs >= startMs + 105 * 60 * 1000) {
    status = 'finished';
    minute = 90;
    if (scores && scores.length > 0) {
      const latest = scores[scores.length - 1];
      const p1Goals = latest.Stats?.[1] ?? 0;
      const p2Goals = latest.Stats?.[2] ?? 0;
      if (f.Participant1IsHome) {
        homeScore = p1Goals;
        awayScore = p2Goals;
      } else {
        homeScore = p2Goals;
        awayScore = p1Goals;
      }
    }
  } else if (nowMs >= startMs) {
    status = 'live';
    if (scores && scores.length > 0) {
      const latest = scores[scores.length - 1];
      
      if (latest.Minute !== undefined && latest.Minute !== null) {
        minute = latest.Minute;
      } else if (latest.Clock?.Seconds !== undefined && latest.Clock?.Seconds !== null) {
        minute = Math.floor(latest.Clock.Seconds / 60);
      } else {
        minute = Math.min(90, Math.max(0, Math.floor((nowMs - startMs) / 60000)));
      }

      const p1Goals = latest.Stats?.[1] ?? 0;
      const p2Goals = latest.Stats?.[2] ?? 0;
      if (f.Participant1IsHome) {
        homeScore = p1Goals;
        awayScore = p2Goals;
      } else {
        homeScore = p2Goals;
        awayScore = p1Goals;
      }
    } else {
      minute = Math.min(90, Math.max(0, Math.floor((nowMs - startMs) / 60000)));
    }
  } else {
    status = 'upcoming';
    minute = 0;
  }

  return {
    id: String(f.FixtureId),
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    minute,
    status,
    startTime: startTimeISO,
    competition: f.Competition || 'FIFA World Cup 2026'
  };
}

/** Map TxODDS odds entries to our internal Market array. */
function oddsToMarkets(fixtureId: number, entries: TxOddsEntry[]): Market[] {
  const grouped = new Map<number, TxOddsEntry[]>();

  for (const e of entries) {
    const existing = grouped.get(e.MarketId) || [];
    existing.push(e);
    grouped.set(e.MarketId, existing);
  }

  const markets: Market[] = [];

  for (const [, outcomes] of grouped) {
    const first = outcomes[0];
    const mappedType = mapMarketType(first.MarketType);
    const timeRemaining = 900; // default 15 min

    markets.push({
      id: `tx-${first.MarketId}`,
      matchId: String(fixtureId),
      type: mappedType,
      question: generateQuestion(mappedType, outcomes),
      outcomes: outcomes.map((o) => ({
        id: `out-${o.MarketId}-${o.Outcome}`,
        label: o.Outcome,
        odds: Math.round(o.Odds * 100),
      })),
      status: 'open',
      stakePool: 0,
      timeRemaining,
      opensAt: first.LastUpdated,
      closesAt: new Date(Date.now() + timeRemaining * 1000).toISOString(),
    });
  }

  return markets;
}

function mapMarketType(txType: string): MarketType {
  const upper = txType.toUpperCase();
  if (upper.includes('GOAL')) return 'NEXT_GOAL_TIMER';
  if (upper.includes('CORNER')) return 'NEXT_CORNER';
  if (upper.includes('CARD') || upper.includes('YELLOW') || upper.includes('RED'))
    return 'NEXT_CARD';
  if (upper.includes('OVER') || upper.includes('UNDER') || upper.includes('OU'))
    return 'GOALS_OVER_UNDER';
  if (upper.includes('SUB') || upper.includes('SUBSTITUTION'))
    return 'NEXT_SUBSTITUTION';
  if (upper.includes('PLAYER') || upper.includes('SCORER'))
    return 'PLAYER_NEXT_GOAL';
  return 'NEXT_GOAL_TIMER';
}

function generateQuestion(type: MarketType, outcomes: TxOddsEntry[]): string {
  switch (type) {
    case 'NEXT_GOAL_TIMER':
      return 'Will a goal be scored in the next 15 minutes?';
    case 'NEXT_CORNER':
      return 'Which team wins the next corner?';
    case 'NEXT_CARD':
      return 'Will there be a card in the next 15 minutes?';
    case 'GOALS_OVER_UNDER':
      return 'Will the total goals be over 2.5?';
    case 'NEXT_SUBSTITUTION':
      return 'Will there be a substitution in the next 15 minutes?';
    case 'PLAYER_NEXT_GOAL':
      return 'Which player will score next?';
    default:
      return outcomes.map((o) => `${o.Outcome} @ ${o.Odds}`).join(' | ');
  }
}

// ─── Service ─────────────────────────────────────────────────────

class TxODDSService {
  private origin: string = ORIGIN_MAINNET;

  /** HTTP client with only guest JWT (no activated API token yet). */
  private guestHttp: AxiosInstance | null = null;

  /** HTTP client with full auth (JWT + activated API token). */
  private fullHttp: AxiosInstance | null = null;

  private jwt: string | null = null;
  private apiToken: string | null = null;

  /** Returns the current guest JWT (needed by activation service). */
  getJwt(): string | null { return this.jwt; }



  private makeHttp(jwt: string, apiToken?: string): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    };
    if (apiToken) {
      headers['X-Api-Token'] = apiToken;
    }
    return axios.create({
      baseURL: this.origin,
      timeout: 30_000,
      headers,
    });
  }

  /**
   * Initialize a guest session automatically.
   * Tries to load a cached JWT from AsyncStorage first,
   * then falls back to calling POST /auth/guest/start.
   */
  async initGuestSession(useDevnet = true): Promise<boolean> {
    this.origin = useDevnet ? ORIGIN_DEVNET : ORIGIN_MAINNET;

    // Try cached JWT first
    try {
      const cachedJwt = await AsyncStorage.getItem(STORAGE_KEY_JWT);
      const cachedToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);

      if (cachedJwt) {
        this.jwt = cachedJwt;
        this.guestHttp = this.makeHttp(cachedJwt);

        if (cachedToken) {
          this.apiToken = cachedToken;
          this.fullHttp = this.makeHttp(cachedJwt, cachedToken);
        }

        console.log('[TxODDS] Restored session from cache. Activated:', !!cachedToken);
        return true;
      }
    } catch (e) {
      console.warn('[TxODDS] Could not read cached credentials:', e);
    }

    // Fetch new guest JWT
    try {
      const resp = await axios.post<{ token: string }>(
        `${this.origin}/auth/guest/start`,
        {},
        { timeout: 15_000 },
      );
      const jwt = resp.data?.token;
      if (!jwt) throw new Error('No token in guest start response');

      this.jwt = jwt;
      this.guestHttp = this.makeHttp(jwt);

      await AsyncStorage.setItem(STORAGE_KEY_JWT, jwt);
      console.log('[TxODDS] Guest session initialized.');
      return true;
    } catch (err) {
      console.warn('[TxODDS] Failed to start guest session:', err);
      return false;
    }
  }

  /**
   * Activate a subscription with an on-chain transaction signature.
   * Call this after the user signs the subscribe tx on-chain.
   */
  async activateSubscription(
    txSig: string,
    walletSignature: string,
    leagues: number[] = [],
  ): Promise<boolean> {
    if (!this.guestHttp || !this.jwt) {
      console.warn('[TxODDS] Cannot activate — no guest session');
      return false;
    }

    try {
      const resp = await this.guestHttp.post<any>(
        '/api/token/activate',
        { txSig, walletSignature, leagues },
      );
      console.log('[TxODDS] Activation response data:', resp.data);
      let apiToken = resp.data?.token;
      if (!apiToken && typeof resp.data === 'string') {
        apiToken = resp.data;
      }
      if (!apiToken) {
        throw new Error(`No token in activation response. Body: ${JSON.stringify(resp.data)}`);
      }

      this.apiToken = apiToken;
      this.fullHttp = this.makeHttp(this.jwt, apiToken);

      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, apiToken);
      console.log('[TxODDS] Subscription activated!');
      return true;
    } catch (err) {
      console.warn('[TxODDS] Activation failed:', err);
      return false;
    }
  }

  /**
   * Manually configure the service with existing credentials (e.g. from .env).
   * Useful during development when you already have a JWT + token.
   */
  configure(jwt: string, apiToken: string, useDevnet = true) {
    this.origin = useDevnet ? ORIGIN_DEVNET : ORIGIN_MAINNET;
    this.jwt = jwt;
    this.apiToken = apiToken;
    this.guestHttp = this.makeHttp(jwt);
    this.fullHttp = this.makeHttp(jwt, apiToken);
    console.log('[TxODDS] Manually configured with credentials.');
  }

  /** Whether we have at least guest auth (can call basic endpoints). */
  get hasGuestAuth(): boolean {
    return this.guestHttp !== null;
  }

  /** Whether we have a fully activated API token. */
  get isActivated(): boolean {
    return this.fullHttp !== null;
  }

  /** @deprecated Use hasGuestAuth or isActivated instead. */
  get isConfigured(): boolean {
    return this.hasGuestAuth;
  }

  // ── Data Endpoints ─────────────────────────────────────────────

  /**
   * Fetch all World Cup fixtures.
   * Requires an activated API token.
   */
  async getFixtures(): Promise<Match[]> {
    // The fixtures endpoint requires a fully activated API token (X-Api-Token).
    // A guest-only JWT will always get 403.
    if (!this.fullHttp) {
      console.log('[TxODDS] No activated API token yet. Subscribe on-chain for live data.');
      return [];
    }

    try {
      const { data } = await this.fullHttp.get<TxFixture[]>('/api/fixtures/snapshot');
      console.log('[TxODDS] getFixtures raw response data:', JSON.stringify(data, null, 2));

      if (!data || data.length === 0) {
        console.log('[TxODDS] API returned 0 fixtures.');
        return [];
      }

      const matches: Match[] = [];
      for (const fixture of data) {
        let scores: TxScoreEntry[] | undefined;
        try {
          const scoresRes = await this.fullHttp.get<TxScoreEntry[]>(
            `/api/scores/snapshot/${fixture.FixtureId}`,
          );
          scores = scoresRes.data;
          console.log(`[TxODDS] getScores raw response data for fixture ${fixture.FixtureId}:`, JSON.stringify(scores, null, 2));
        } catch {
          // No scores yet — fixture is upcoming
        }
        matches.push(fixtureToMatch(fixture, scores));
      }

      console.log(`[TxODDS] Fetched ${matches.length} fixtures from API`);
      return matches;
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        // JWT expired — clear cache so next launch re-authenticates
        console.log('[TxODDS] 401 — JWT expired, clearing credentials');
        await AsyncStorage.multiRemove([STORAGE_KEY_JWT, STORAGE_KEY_TOKEN]);
        this.jwt = null;
        this.apiToken = null;
        this.guestHttp = null;
        this.fullHttp = null;
      } else if (status === 403) {
        // Subscription expired or not yet activated — expected, not a crash
        console.log('[TxODDS] 403 — subscription not active.');
      } else {
        console.log(`[TxODDS] getFixtures HTTP ${status ?? 'error'}`);
      }

      return [];
    }
  }

  /**
   * Fetch odds for a specific fixture.
   */
  async getOdds(fixtureId: string): Promise<Market[]> {
    const http = this.fullHttp; // Odds require activated token
    if (!http) {
      console.log(`[TxODDS] No activated token for ${fixtureId}`);
      return [];
    }

    try {
      const { data } = await http.get<TxOddsEntry[]>(
        `/api/odds/snapshot/${fixtureId}`,
      );
      console.log(`[TxODDS] getOdds raw response data for fixture ${fixtureId}:`, JSON.stringify(data, null, 2));
      if (!data || data.length === 0) {
        return [];
      }
      return oddsToMarkets(Number(fixtureId), data);
    } catch (error) {
      console.warn(`[TxODDS] getOdds failed for ${fixtureId}`);
      return [];
    }
  }

  /** Fetch live scores for a fixture. */
  async getScores(fixtureId: string): Promise<TxScoreEntry[]> {
    const http = this.fullHttp || this.guestHttp;
    if (!http) return [];

    try {
      const { data } = await http.get<TxScoreEntry[]>(
        `/api/scores/snapshot/${fixtureId}`,
      );
      console.log(`[TxODDS] getScores raw response data for fixture ${fixtureId}:`, JSON.stringify(data, null, 2));
      return data;
    } catch {
      return [];
    }
  }

  /** Fetch live score updates for a fixture. */
  async getScoreUpdates(fixtureId: string): Promise<TxScoreEntry[]> {
    const http = this.fullHttp || this.guestHttp;
    if (!http) return [];

    try {
      const { data } = await http.get<TxScoreEntry[]>(
        `/api/scores/updates/${fixtureId}`,
      );
      return data;
    } catch {
      return [];
    }
  }

  /** Health check — returns true if API is reachable. */
  async healthCheck(): Promise<boolean> {
    const http = this.guestHttp;
    if (!http) return false;
    try {
      await http.get('/api/fixtures/snapshot', { timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const txoddsService = new TxODDSService();
