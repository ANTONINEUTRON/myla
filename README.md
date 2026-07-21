# MYLA — Make Your Live Assessment

> **A real-time parimutuel micro-prediction terminal for football fans, powered by TxODDS TxLine Live Data Feeds.**

**Built for:** Solana Seeker dapp store (React Native + Solana Mobile Stack + Custom Anchor Program)

## Live Links
* **Landing Page**: https://myla.titalabs.xyz
* **Devnet App Download**: [Release APK](https://github.com/ANTONINEUTRON/myla/releases)
* **Smart Contract (Devnet)**: [`9AhsF4FXa6GPqVWJEaCdPeK3jptuGPfZpDk24Co5odsf`](https://solscan.io/account/9AhsF4FXa6GPqVWJEaCdPeK3jptuGPfZpDk24Co5odsf?cluster=devnet) 

---

## The Pitch

**Every minute of a football match is a moment of drama — MYLA turns each moment into a prediction you can stake on.**

MYLA is a mobile-first parimutuel micro-prediction app that runs in real-time during live football matches. Instead of betting on the final score hours in advance or waiting for slow peer-to-peer 1v1 matchmaking, MYLA aggregates all participant capital into a shared on-chain pool (using Program Derived Addresses - PDAs).

Stakes are locked in pools and resolved trustlessly based on live TxODDS match data. When a pool is resolved (e.g. at Minute 45), the custom Solana program distributes the total pool proportionally among all winners, minus a 5% developer commission.

**Why this wins:**
- **Real-time engagement:** Turns every minute of a football match into a thrilling moment to predict.
- **Parimutuel Liquidity:** No order book or waiting for counterparties — all bets go into a shared pool and get distributed fairly among winners.
- **Biometric confirmations:** One-tap predictions with wallet confirmation using the Solana Mobile Wallet Adapter (MWA).
- **On-chain integrity:** Verified on-chain via TxODDS data and settled trustlessly.

---

## Key Features

### Live Match Feed
A swipeable card interface showing active micro-markets (Corners, Goals, Cards) during a match. The card displays live match events, scoreboards, and statistics in real-time.

### Interactive SVG Chart & Target Slider
Users can tap and drag on a future minute/value coordinate on a stepped line chart to select a custom prediction target (e.g. "Will Corners be Over 6.5 at Min 45?").

### Staking Presets & Custom Input
Select standard presets (`0.05`, `0.1`,`0.5` SOL) or specify a custom stake size through a biometric-authorized dialog.

### Live Pool Breakdown Panel
Dynamically visualizes the Over vs Under SOL distribution bar, player counts, estimated payout, net profit, effective odds, and your percentage share of the winning pool.

### Seeker-Native Wallet Integration
- Message signing and transaction authorization via `@solana-mobile/mobile-wallet-adapter`.
- Hardware wallet confirmation via native biometrics.
- Support for devnet test environments.

---

## Business Model

MYLA operates on a simple, risk-free revenue model:
- **Platform Commission:** A flat 5% fee is deducted from the total winning pool before payouts are distributed to the winners. 
- **Zero House Risk:** Because all markets are parimutuel (community-driven pools), the platform does not act as a bookmaker and takes no positional risk. All payouts are purely funded by the participants' staked capital.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native (Expo, TypeScript) |
| **Solana Integration** | Solana Mobile Stack (SMS), `@solana-mobile/mobile-wallet-adapter` |
| **Smart Contracts** | Anchor Program (`anchor/`) |
| **Data Oracles** | TxODDS Tx LINE Live Feeds |

---

## Project Structure

```
myla/
├── src/                    # React Native Expo app source code
│   ├── components/         # Reusable UI (CustomStakeModal, PoolBreakdown, TimelineChart)
│   ├── context/            # Global Wallet Context (MWA messaging & signing)
│   ├── hooks/              # Custom Hooks (useMatchFeed, useMatchContext)
│   ├── screens/            # HomeScreen
│   ├── services/           # API Services (txoddsService)
│   └── theme.ts            # Design system tokens
├── anchor/                 # Solana Anchor smart contracts
│   ├── programs/           # On-chain parimutuel pool programs
│   └── tests/              # Anchor test suite
├── landing_page/           # Web landing page (Firebase Hosting)
├── oracle/                 # Off-chain oracle resolution backend (Firebase Functions)
│   └── functions/src/      # Cron function to read TxODDS and resolve pools
├── docs/                   # Hackathon pitch & requirements documents
│   └── ARCHITECTURE.md     # Technical specification & system architecture
├── PITCH.md                # Hackathon presentation outline
├── README.md               # Setup and development guide
└── SP_BOUNTY.md            # Hackathon track requirements checklist
```

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)
- Anchor CLI (for smart contract)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Mobile App
Start the Expo development server:
```bash
npx expo start
```
To run on an Android emulator or a physical Seeker device:
```bash
npm run android
```

### 4. Smart Contracts
To build and test the Solana program:
```bash
cd anchor
anchor build
anchor test
```

### 5. Run the Oracle
To build the Firebase Functions oracle resolver:
```bash
cd oracle/functions
npm install
npm run build
```

---

Built for the [Superteam World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup)  