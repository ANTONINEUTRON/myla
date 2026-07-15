// TxODDS API response types

/** A single fixture from GET /api/fixtures/snapshot */
export interface TxFixture {
  FixtureId: number;
  StartTime: string; // ISO 8601
  Participant1: string; // Home or away depending on Participant1IsHome
  Participant2: string;
  Participant1IsHome: boolean;
  CompetitionId: number;
  Competition: string;
  Sport: string;
}

/** A single odds entry from GET /api/odds/snapshot/:fixtureId */
export interface TxOddsEntry {
  FixtureId: number;
  MarketId: number;
  MarketType: string;
  Outcome: string;
  Odds: number;
  LastUpdated: string;
}

/** A single scores entry from GET /api/scores/snapshot/:fixtureId */
export interface TxScoreEntry {
  FixtureId: number;
  GamePhase: TxGamePhase;
  Minute?: number;
  Clock?: {
    Running: boolean;
    Seconds: number;
  };
  Stats: Record<string, number>; // keys: 1=P1 goals, 2=P2 goals, etc.
  Timestamp: string;
}

/** Game phase IDs from the soccer feed spec */
export type TxGamePhase =
  | 1  // NS - Not started
  | 2  // H1 - First half
  | 3  // HT - Halftime
  | 4  // H2 - Second half
  | 5  // F - Finished
  | 6  // WET - Waiting extra time
  | 7  // ET1 - Extra time first half
  | 8  // HTET - Extra time halftime
  | 9  // ET2 - Extra time second half
  | 10 // FET - Finished extra time
  | 11 // WPE - Waiting penalties
  | 12 // PE - Penalties in progress
  | 13 // FPE - Finished penalties
  | 14 // I - Interrupted
  | 15 // A - Abandoned
  | 16 // C - Cancelled
  | 19; // P - Postponed

/** Activation response from POST /api/token/activate */
export interface TxActivationResponse {
  token: string;
}
