# MYLA — Make Your Live Assessment

> **A real-time micro-prediction game for the Solana Seeker, powered by TxODDS live World Cup data.**

![World Cup Hackathon]()

## Superteam World Cup Hackathon — Track 3: Trading Tools & Agents

**Prize Pool:** $16,000 USDT  
**Timeline:** June 24 – July 19, 2026  
**Submitted to:** [Superteam Earn — Trading Tools & Agents Track](https://superteam.fun/earn/listing/trading-tools-and-agents)  
**Built for:** Solana Seeker dapp store (React Native + Solana Mobile Stack)

---

## The Pitch

**Every minute of a World Cup match is a moment of drama — MYLA turns each moment into a prediction you can stake on.**

MYLA is a mobile-first micro-prediction market game that runs in real-time during live World Cup matches. Instead of betting on the final score hours in advance, MYLA opens short-rolling markets that last 5–30 minutes — "Who gets the next corner?", "Will there be a goal in the next 10 minutes?", "Next yellow card to Team A or B?"

Fans tap their predictions, stake small amounts of SOL, and watch the odds shift in real-time as the match unfolds. Every corner, shot, card, and substitution becomes a potential win. Markets auto-resolve via TxODDS live data, and winnings are instantly credited on-chain.

**Why this wins:**
- **Real-time engagement:** Turns even a 0-0 draw into a thrilling experience
- **Low friction:** One-tap predictions with Seeker biometrics — no complex order books
- **On-chain by default:** Every market resolves trustlessly via TxODDS verifiable data
- **Seeker-first:** First-mover advantage on the Solana Mobile Stack dapp store
- **Social virality:** Friend leaderboards, streak NFTs, shareable prediction cards

---

## Key Features

### Live Match Feed
A swipeable card interface (like TikTok/Stories) showing active micro-markets during a match. Each card shows the current odds, time remaining, and stake pool.

### Micro-Market Types
- **Next Goal Within X Min** — Over/under on a goal being scored
- **Next Corner** — Which team wins the next corner kick
- **Next Card** — Which team gets the next yellow/red card
- **Goals Over/Under** — Total goals in the next N minutes
- **Next Substitution** — Which team makes the next sub
- **Player to Score Next** — Choose from active players (during high-probability moments)

### Real-Time Odds Visualization
Dynamic probability meter showing how odds shift with each match event. Watch the line move after a near-miss, a VAR review, or a substitution.

### Seeker-Native Experience
- Biometric tap-to-confirm predictions
- Hardware wallet integration via `@solana-mobile/mobile-wallet-adapter`
- Push notifications for market openings and results
- Optimized for Seeker's form factor

### Social & Streaks
- Consecutive correct predictions build streaks
- Streak milestones earn on-chain NFT badges
- Global and friends leaderboards
- Share prediction results as social cards

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native (Expo) |
| **Solana Integration** | Solana Mobile Stack, `@solana-mobile/mobile-wallet-adapter` |
| **Smart Contracts** | Solana native programs (Anchor) |
| **Oracles** | TxODDS Tx LINE (verifiable on-chain match data) |
| **Live Data** | TxODDS Fusion Odds + TxODDS Scores |
| **Backend** | Node.js / TypeScript (market engine, data ingestion) |
| **State Management** | React Query + Zustand |
| **UI/Styling** | NativeWind (Tailwind for RN) |

---

## 📁 Project Structure

```
myla/
├── app/                    # React Native Expo app
│   ├── screens/            # Match feed, wallet, profile, leaderboard
│   ├── components/         # Shared UI: prediction card, odds meter, etc.
│   ├── hooks/              # Custom hooks (useMatchFeed, useMarket, etc.)
│   ├── services/           # API clients (TxODDS, Solana RPC)
│   └── navigation/         # React Navigation setup
├── contracts/              # Anchor smart contracts
│   ├── programs/           # On-chain market programs
│   └── tests/              # Contract tests
├── backend/                # Off-chain market engine
│   ├── src/
│   │   ├── markets/        # Market lifecycle management
│   │   ├── oracle/         # TxODDS data ingestion & verification
│   │   └── api/            # REST/WebSocket API for the app
│   └── tests/
├── docs/                   # Requirements, pitch, architecture docs
├── README.md
└── SP_BOUNTY.md
```

---

## 🚀 Getting Started

*Coming soon — setup instructions for local development.*

---

## 📬 Contact

Built for the [Superteam World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup)  
Questions? Reach out on [TxODDS Telegram](https://t.me/TxLINEChat)
