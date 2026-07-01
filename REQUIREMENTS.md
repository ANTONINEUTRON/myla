# MYLA — Requirements Document

## 1. Overview

**MYLA (Make Your Live Assessment)** is a mobile dapp for the Solana Seeker that enables real-time micro-prediction gaming during live World Cup matches. It uses TxODDS live match data to open, manage, and resolve short-duration prediction markets, creating an engaging second-screen experience for football fans.

---

## 2. User Stories

### 2.1 Match Viewing & Market Discovery

| ID | User Story | Priority |
|----|-----------|----------|
| US-01 | As a user, I want to see a live list of ongoing/upcoming World Cup matches so I can choose where to participate | P0 |
| US-02 | As a user, I want to see active micro-markets for a selected match in a swipeable card feed | P0 |
| US-03 | As a user, I want each market card to show the question, current odds, time remaining, and total stake pool | P0 |
| US-04 | As a user, I want real-time odds to update visually as the match progresses | P0 |
| US-05 | As a user, I want to see historical match events (goals, cards, subs) alongside active markets | P1 |

### 2.2 Prediction & Staking

| ID | User Story | Priority |
|----|-----------|----------|
| US-06 | As a user, I want to tap a market outcome to make a prediction | P0 |
| US-07 | As a user, I want to confirm my prediction with a single biometric tap (Seeker hardware) | P0 |
| US-08 | As a user, I want to choose my stake amount (small preset amounts) when predicting | P0 |
| US-09 | As a user, I want to see my active predictions and their current status | P0 |
| US-10 | As a user, I want to receive a push notification when a market is about to close | P1 |

### 2.3 Settlement & Rewards

| ID | User Story | Priority |
|----|-----------|----------|
| US-11 | As a user, I want markets to auto-resolve immediately when the condition is met (or market expires) | P0 |
| US-12 | As a user, I want to see the result animation when I win (confetti, badge, SOL amount) | P0 |
| US-13 | As a user, I want winnings automatically credited to my wallet | P0 |
| US-14 | As a user, I want to view my prediction history and P&L | P1 |

### 2.4 Social & Gamification

| ID | User Story | Priority |
|----|-----------|----------|
| US-15 | As a user, I want to build a streak of consecutive correct predictions | P1 |
| US-16 | As a user, I want to earn NFT badges for streak milestones (3, 5, 10 correct) | P1 |
| US-17 | As a user, I want to see a global leaderboard of top predictors | P1 |
| US-18 | As a user, I want to create or join friend groups for private leaderboards | P2 |
| US-19 | As a user, I want to share my prediction results as a social media card | P2 |

### 2.5 Wallet & Onboarding

| ID | User Story | Priority |
|----|-----------|----------|
| US-20 | As a first-time user, I want to connect my Solana wallet quickly via Seeker | P0 |
| US-21 | As a user, I want to see my SOL balance and prediction stats on a profile screen | P1 |
| US-22 | As a user, I want to deposit/withdraw SOL without leaving the app | P1 |

---

## 3. Functional Requirements

### 3.1 Market Types

| Market Type | Question Template | Resolution Data | Typical Duration |
|-------------|------------------|-----------------|------------------|
| NEXT_GOAL_TIMER | "Will a goal be scored in the next X minutes?" | TxODDS live score events | 10-20 min |
| NEXT_CORNER | "Which team wins the next corner?" | TxODDS match events | 5-25 min |
| NEXT_CARD | "Which team gets the next yellow/red card?" | TxODDS match events | 10-40 min |
| GOALS_OVER_UNDER | "Total goals in the next X min — over/under Y?" | TxODDS live score | 15-30 min |
| NEXT_SUBSTITUTION | "Which team makes the next substitution?" | TxODDS match events | 10-30 min |
| PLAYER_NEXT_GOAL | "Which player scores next?" | TxODDS goal scorer data | Until next goal |

### 3.2 Market Lifecycle

```
CREATED → OPEN → (LOCKED) → RESOLVED → SETTLED
              ↘ EXPIRED
```

1. **CREATED** — Market defined with question, outcomes, trigger conditions
2. **OPEN** — Accepting predictions; odds update in real-time
3. **LOCKED** — Predictions window closed; waiting for event to occur or timer to expire
4. **RESOLVED** — Outcome determined via TxODDS data (win/lose/void)
5. **SETTLED** — Winnings distributed on-chain
6. **EXPIRED** — Market closed with no resolution (e.g., match abandoned)

### 3.3 Market Opening Triggers

Markets open automatically based on match state:
- **Match start** — First batch of markets open
- **Goal scored** — "Next goal" markets resolve, new batch opens with fresh conditions
- **Halftime** — Special halftime markets (e.g., "Will there be a goal in first 15 min of 2nd half?")
- **Red card** — Card-related markets resolve, new odds reflect team advantage
- **15-min intervals** — Rolling over/under markets on a timer

### 3.4 Data Integration (TxODDS)

| Data Source | Usage | Refresh Rate |
|-------------|-------|-------------|
| TxODDS Fusion Odds | Live odds for market creation and real-time odds display | ~12ms |
| TxODDS Scores | Match events (goals, cards, subs) for market resolution | Real-time |
| Tx LINE | Verifiable on-chain proofs for settlement | Per resolution event |

### 3.5 Fee Model

- **House fee:** 2% of each stake pool
- **Dynamic rebates:** Streak holders get reduced fees (1% at 3-streak, 0.5% at 5-streak)
- **Referral bonus:** 10% of house fee shared with referrer for first month

---

## 4. Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Performance** | Market card load time | < 500ms |
| **Performance** | Odds update latency | < 1 second (display) |
| **Performance** | Prediction confirmation | < 3 seconds (on-chain) |
| **Availability** | Uptime during World Cup matches | 99.5% |
| **Security** | Smart contract audited | Minimal attack surface; time-locked admin functions |
| **Security** | Stake limits per market | Configurable max to limit exposure |
| **UX** | App size | < 50MB |
| **UX** | Required user actions per prediction | ≤ 2 taps |
| **Compatibility** | Supported devices | Solana Seeker, Android 12+ |

---

## 5. Constraints & Assumptions

### Constraints
- **Timeline:** Hackathon submission by July 19, 2026
- **World Cup schedule:** Matches run through July 19 — we must be live before that
- **Mobile-only:** Seeker dapp store requires React Native or native Android
- **TxODDS API access:** Requires API key; need to confirm rate limits and data coverage

### Assumptions
- TxODDS provides sufficiently low-latency data for real-time market resolution
- Solana fee structures allow economical micro-staking (sub-cent transactions)
- Seeker device supports push notifications
- List of World Cup matches and schedules is available programmatically

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Active users during peak match hours | 100+ |
| Average predictions per user per match | 15+ |
| Market resolution accuracy | 100% (correct outcomes) |
| App rating on Seeker dapp store | 4.5+ |

---

## 7. Future Roadmap (Post-Hackathon)

- Support for other football leagues (Premier League, Champions League)
- Multi-language support (Spanish, Arabic, Portuguese, French)
- Custom market creation by power users
- Social tipping — share a portion of winnings with friends
- Stream overlay mode for content creators
- Cross-app identity with Solana Name Service
