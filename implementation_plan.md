# MYLA — Sports Binary Options Integration Plan

A detailed plan to build the MYLA Sports Binary Options (Hi-Lo) Trading Platform, integrating **TxODDS live data**, **DuelDuck on-chain clearing contracts**, and **Firebase (Firestore & Cloud Functions) serverless backend**.

---

## 🎯 UI/UX Design: Interactive Live Charting Terminal

Rather than static lists, the interface is structured as an interactive **Live Match Timeline Chart** that visualizes the historical accumulation of match statistics and allows users to tap/drag to lock in predictions.

```
┌────────────────────────────────────────────────────────┐
│  [📈 MATCH TERMINAL]             Brazil 1 - 0 Croatia  │
│  Minute 18                       Corners: 3 (H: 2, A: 1)│
├────────────────────────────────────────────────────────┤
│  [⚽ GOALS]         [🚩 CORNERS]         [🎴 CARDS]    │
├────────────────────────────────────────────────────────┤
│  Y-Axis (Count)                                        │
│   6 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─── (HI ZONE / Call) │
│   5 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ───[🎯]   +112% Return     │
│   4 ─ ─ ─ ─ ─ ─ ─ ─ ───────┐   │                       │
│   3 ───────────┐           │   │ ─── (LO ZONE / Put)   │
│   2 ─────┐     │           │   │     +68% Return       │
│   1 ─────┘     │           │   │                       │
│   0 ───────────┴───────────┴───┴────────────────────── │
│   Mins:  5    10    15    [18]  30   45   60   75   90   │
│                         (Live)    (Strike target)      │
├────────────────────────────────────────────────────────┤
│   [ STAKE: 0.1 SOL ]            [ 🟢 BUY HI (Call) ]   │
├────────────────────────────────────────────────────────┤
│  [ ACTIVE POSITIONS ]                                  │
│  🚩 Corners > 4.5 @ Min 30  |  ITM (Win)               │
│  Stake: 0.1 SOL             |  [ CASH OUT: 0.14 SOL ]  │
└────────────────────────────────────────────────────────┘
```

### 1. Interactive Live Timeline Chart (SVG-driven)
* **Real-time Stats Curve:** Displays a stepped line chart (0 to 90 minutes) showing the actual events of the match (e.g. goals, corners, cards). The line updates live as TxODDS pushes new events.
* **Vertical "Live" Separator:** A pulse-animated vertical bar representing the current match minute (e.g., Minute 18).
  * **Past Zone (Left of Separator):** Solid colored line and dark grey grid, representing immutable historical match data.
  * **Trading Zone (Right of Separator):** Highlighted future area of the match where options can be placed.

### 2. Tap-to-Select Prediction Target (Crosshair Interface)
* **Interactive Target Crosshair [🎯]**: The user drags their finger or taps within the future "Trading Zone" on the chart to set their trade:
  * **X-Axis Snapping (Strike Minute):** Snaps to upcoming 5-minute cells (e.g. dragging horizontally selects Min 25, 30, 45, 60, etc.).
  * **Y-Axis Snapping (Strike Level):** Snaps to half-intervals (e.g. dragging vertically selects `3.5`, `4.5`, `5.5` corners).
* **Dynamic Prediction Shade Overlay:** When the crosshair is placed:
  * The chart area above the selected line ($y > L_{strike}$) turns into a glowing **green gradient (HI Zone)**.
  * The chart area below the line ($y < L_{strike}$) turns into a glowing **red gradient (LO Zone)**.
  * Interactive callouts appear directly next to the crosshair showing the current implied odds/returns (e.g. `HI: +112%` | `LO: +68%`).

### 3. Staking & Swipe-to-Trade
* Once a coordinate is selected on the chart, the bottom sheet slides up slightly to show:
  * Stake input and quick SOL selectors.
  * Big green/red execution buttons or a slider: **🟢 BUY HI (Call)** or **🔴 BUY LO (Put)**.
  * Swipe-to-Trade gesture: Swiping the trade button initiates the MWA wallet connection and transaction signature securely.

### 4. Active Options Overlay
* Active positions are plotted directly **on the line chart** as small circular targets.
* As the match clock progresses, the line chart's active line grows toward the targets.
* Tapping a position target on the chart reveals a tooltip showing:
  * Target stats details.
  * Current PnL.
  * A micro **Cash Out** button directly in the tooltip, so the user can manage their active positions while looking at the chart.

---

## ☁️ Backend Architecture: Firebase & DuelDuck

Firebase handles real-time data sync via Firestore and operates the **Autonomous Option-Broker Agent** using serverless Cloud Functions.

```
               [TxODDS Stats & Clock Feed]
                           │
                           ▼
             [Firebase Cloud Functions]
             ├── 1. Sync Live Match Data
             ├── 2. Auto-Create Duels (DuelDuck API)
             └── 3. Auto-Resolve Duels (On Strike Expiry)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
     [Firestore Db]              [DuelDuck Program]
     ├── Matches                 ├── Escrow Vaults
     ├── Options Contracts       ├── Payout Signatures
     └── User Positions          └── Commissions
             ▲                           ▲
             │                           │ (MWA Tx Sign)
             └───────────[ dApp ]────────┘
```

### 1. Firestore Schema

#### `matches` (real-time scoreboard)
```typescript
{
  id: string,               // TxODDS fixture ID
  minute: number,
  status: 'upcoming' | 'live' | 'finished',
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  corners: number,          // Cumulative corners
  cards: number,            // Cumulative yellow + red cards
  lastUpdated: timestamp
}
```

#### `options_contracts` (individual duels registered on DuelDuck)
```typescript
{
  id: string,               // Firestore ID
  duelDuckId: string,       // ID returned by DuelDuck API
  matchId: string,
  asset: 'goals' | 'corners' | 'cards',
  strikeMinute: number,
  strikeLevel: number,
  deadline: timestamp,      // When predictions lock (T_strike - 3 mins)
  payoutHi: number,         // Implied odds for HI (e.g. 2.10)
  payoutLo: number,         // Implied odds for LO (e.g. 1.75)
  status: 'open' | 'locked' | 'resolved' | 'cancelled',
  winningOutcome?: 0 | 1    // 1 = HI, 0 = LO
}
```

#### `user_positions` (user's open/settled option trades)
```typescript
{
  id: string,
  userId: string,           // Wallet address
  duelId: string,           // DuelDuck ID
  stake: number,            // SOL staked
  direction: 'hi' | 'lo',
  buyMinute: number,        // Clock minute when opened
  buyValue: number,         // Stat count when opened
  payout: number,           // Odds locked at purchase
  status: 'pending' | 'won' | 'lost' | 'cashed_out',
  cashOutAmount?: number,
  txSig: string,            // Solana join transaction signature
  createdAt: timestamp
}
```

### 2. Firebase Cloud Functions (Broker Agent Logic)

#### `syncMatchStats` (Cron Trigger - runs every 10 seconds during active matches)
1. Fetches live scoreboard, clock, and detailed statistics (keys `"1"`/`"2"` for goals, `"7"`/`"8"` for corners, `"5"`/`"6"` for cards) from TxODDS API.
2. Updates `matches` document.
3. If the match is live and minutes have progressed:
   * **Instantiates New Cells:** Creates new options contracts for upcoming 5-minute cells (e.g. if minute is 12, creates Minute 20 and 25 contracts) by calling DuelDuck’s `POST /admin/duel` and saving them to Firestore.
   * **Enforces Deadlines:** If the match clock is within 3 minutes of a contract's `strikeMinute`, updates its status to `'locked'` so no more trades are accepted.

#### `resolveOptionContracts` (Database Trigger - runs when `matches.minute` updates)
1. Identifies open `options_contracts` where `match.minute >= contract.strikeMinute`.
2. Resolves the final value of the asset at the `strikeMinute` using the TxODDS feed.
3. Calls DuelDuck’s `PUT /admin/duel/resolve` using the MYLA owner API key:
   * `final_result: 1` (if final count > `strikeLevel`) or `0` (if final count < `strikeLevel`).
4. Updates `options_contracts` in Firestore to `'resolved'`.
5. Updates corresponding `user_positions` status to `'won'` or `'lost'`, triggering real-time UI updates on client devices.

#### `getJoinTransaction` (HTTPS Callable Function)
1. Receives `{ duelId, answer, stakeAmount }` from the mobile client.
2. Authenticates the request and calls DuelDuck's `POST /duel/solana/join/sign-tx`.
3. Returns the base64-encoded serialized Solana transaction to the client, ready to be passed to the Seeker wallet.

---

## 📅 Phased Execution Plan

We will execute the project across 5 distinct development phases, focusing on delivering a high-quality UI/UX demo first before connecting live on-chain and database systems.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ROADMAP TO LAUNCH                             │
├─────────────────────────────────────────────────────────────────────────┤
│ Phase 1: SVG Chart Layout & Touch Crosshair (Interactive UI foundations)│
│ Phase 2: HI/LO Glow Overlays & Real-Time Odds Engine (Aesthetic polish) │
│ Phase 3: Local Staking Panel, Position HUD, and Game Loop Simulation    │
│ Phase 4: Firebase Firestore Setup & Cloud Functions (Sync live data)    │
│ Phase 5: Solana Mobile Wallet Integration & DuelDuck Contracts Connect  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: SVG Timeline Chart & Target Selector Gestures
* **Goal:** Build the core charting coordinate canvas and touch mechanics.
* **Tasks:**
  * Implement an SVG Line Chart component mapping X-Axis (0 to 90 minutes) and Y-Axis (statistic count).
  * Render a stepped historical line representing the mock match stats.
  * Integrate React Native `PanResponder` or gesture systems to track dragging/tapping inside the graph.
  * Add snapping math to constraint target inputs to valid X intervals (5-minute cells) and Y intervals (`0.5` steps).

### Phase 2: HI/LO Glow Overlays & Real-Time Odds Engine
* **Goal:** Style the glowing visual prediction zones and calculate payout multipliers.
* **Tasks:**
  * Add dynamic SVG gradient overlays that render green (HI) above the crosshair level and red (LO) below the crosshair level.
  * Implement a local option pricing calculator where odds update dynamically as the user moves the crosshair closer/further to/from the live scoreboard count or match clock limits.
  * Style the asset tabs (Goals, Corners, Cards) and the primary trade triggers with premium dark theme branding.

### Phase 3: Staking HUD, Local Position Manager, & Match Simulation
* **Goal:** Create a fully functional self-contained trading loop.
* **Tasks:**
  * Build the bottom sheet staking controls (preset SOL selectors, quick execution swipers).
  * Add a local position ledger array in component state to store active option contracts.
  * Implement a simulated match clock tick (e.g. 1 minute elapsed every 5 seconds) to demonstrate live price changes.
  * Update cash-out valuations using the theta decay option pricing model.
  * Trigger victory confetti animations and modal overlays when a contract resolves successfully at the strike minute.

### Phase 4: Firebase Firestore & Cloud Functions Sync
* **Goal:** Transition from local simulation to server-side synchronization.
* **Tasks:**
  * Initialize Firestore instance and create collections: `matches`, `options_contracts`, and `user_positions`.
  * Write the `syncMatchStats` Cron cloud function to fetch TxODDS endpoints, update scoreboard states, and register new cell contracts.
  * Write `resolveOptionContracts` DB trigger function to settle outcomes on cell expiration.

### Phase 5: Solana Mobile Wallet Adapter & DuelDuck Contract Clearing
* **Goal:** Complete the end-to-end on-chain prediction workflow.
* **Tasks:**
  * Wire up the Seeker's Mobile Wallet Adapter context.
  * Write `getJoinTransaction` HTTPS callable Cloud Function that talks to DuelDuck API and returns signed base64 transaction payloads.
  * Pass the payloads to MWA, collect biometric signature, and broadcast the transaction to the Solana blockchain, securing the user's funds in escrow until resolution.


