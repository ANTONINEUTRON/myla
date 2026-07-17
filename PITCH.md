# MYLA — Make Your Live Assessment

## 🏆 Superteam World Cup Hackathon | Track 3: Trading Tools & Agents

---

## The One-Liner

**MYLA turns every minute of a live World Cup match into a prediction you can stake on — resolved in real-time via TxODDS data and settled trustlessly in Solana parimutuel pools.**

---

## The Problem

Watching a World Cup match is exciting, but the experience is passive. Traditional sports betting requires predicting outcomes hours or days in advance and waiting until the final whistle. During the 90 minutes of play, fans have no way to engage with the action in short, meaningful cycles.

Existing prediction markets are:
- ⏱ **Too slow** — Markets last hours or days
- 💻 **Desktop-first** — Not optimized for mobile, let alone the Seeker
- 😴 **Passive** — No real-time feedback loop with the match
- 📉 **Unliquid / Delayed** — 1v1 peer-to-peer matching leaves players waiting with unmatched tickets

---

## The Solution

MYLA is a **mobile parimutuel prediction terminal** that pools on-chain stakes for real-time micro-events during live World Cup matches. Rather than betting against a central bookmaker or waiting for slow 1v1 matchmaking, MYLA aggregates all participant capital into a shared pool and distributes payouts proportionally among all winners using a custom Solana Anchor program.

### How it works

1. **Pick a match** — Browse live World Cup fixtures directly from the TxODDS feed.
2. **Swipe the feed** — See active micro-markets (Corners, Goals, Cards) as scrollable cards.
3. **Set your stake** — Select presets (0.05, 0.1, 0.25, 0.5, 1.0 SOL) or enter a custom amount.
4. **See live pool breakdown** — View the distribution of Over vs. Under stakes, your percentage share, and estimated payout.
5. **Confirm with biometrics** — One-tap on Seeker's hardware using the Solana Mobile Wallet Adapter.
6. **Watch the odds move** — Real-time probability and payout shifts with every match event.
7. **Win instantly** — The oracle script resolves the pool as soon as the event happens — winnings are immediately claimable.

### Market examples

| Market | Duration | Why it's fun |
|--------|----------|-------------|
| "Will a goal be scored in the next 15 min?" | 15 min | Every near-miss raises tension |
| "Which team gets the next corner?" | ~8 min | Turns a routine play into a betting moment |
| "Total goals over/under 0.5 by halftime?" | 15-45 min | Strategic, rewards match knowledge |
| "Next yellow card — Team A or B?" | ~20 min | Adds stakes to every tackle |

---

## Why We Win

### 🎯 Track 3 Fit (Trading Tools & Agents)
MYLA functions as an **automated oracle agent**. It ingests TxODDS live odds and scores, detects finished markets, fetches event statistics, and calls the Solana program to resolve pools and release escrowed funds automatically without manual partner input.

### ⚡ Real-Time by Design
TxODDS' 12ms feed latency means odds and pool breakdown displays update as the ball moves. The UI is built for split-second decisions during live play.

### 🔗 On-Chain Parimutuel Integrity
Every prediction pool is an isolated Solana Program PDA (Program Derived Address). Winnings are distributed trustlessly by a custom Anchor program. The oracle backend reads TxODDS Tx LINE verifiable data and settles the pools on-chain, ensuring absolute mathematical transparency.

### 📱 Seeker First
Optimized for Solana Mobile Stack — biometric tap-to-confirm, hardware wallet, push notifications. First mover on Seeker's dapp store.

### 🌍 Built for the Moment
The 2026 World Cup is happening NOW (June 11 – July 19). We're not building for a hypothetical future — we're building for tonight's match.

---

## What We've Built

| Component | Status |
|-----------|--------|
| React Native Mobile Terminal | ✅ Built (Live feed + SVG step chart + custom stake modal + pool breakdown panel) |
| Solana Program (Anchor) | ✅ Designed (P2P Parimutuel Pool state machine with claim/refund checks) |
| Oracle Resolution Script | ✅ Designed (Cron function to read TxODDS and resolve expired pools on-chain) |
| TxODDS Integration | ✅ Integrated (Live scoreboard feed & 12s polling loops) |
| Seeker Wallet + Biometrics | ✅ Integrated (Solana Mobile Wallet Adapter support) |

---

## The Team

*[Your name / team members]*

---

## Links

- **Hackathon:** [superteam.fun/earn/hackathon/world-cup](https://superteam.fun/earn/hackathon/world-cup)
- **Track:** [Trading Tools & Agents](https://superteam.fun/earn/listing/trading-tools-and-agents)
- **TxODDS:** [txodds.net](https://txodds.net) | [Tx LINE docs](https://txodds.net/our-products/tx-line/)
