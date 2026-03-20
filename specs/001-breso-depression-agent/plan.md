# Implementation Plan: BRESO — AI Mental Wellness Agent

**Branch**: `001-breso-depression-agent` | **Date**: 2026-03-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-breso-depression-agent/spec.md` + expanded design input (2026-03-20)

---

## Summary

BRESO is a bilingual (Spanish/English) AI mental wellness companion that performs daily conversational check-ins, detects early depression signals through behavioral pattern analysis, sends tiered alerts to trusted contacts, and autonomously coordinates professional consultations with USDT payments on Celo. It is registered as a verifiable on-chain agent (ERC-8004) and uses Self Protocol zero-knowledge proofs for identity verification. All consent and payment records are immutable on Celo Alfajores testnet. This is a hackathon MVP — working demo over completeness.

---

## Technical Context

**Language/Version**: Python 3.11 (backend / AI agent), Solidity 0.8.x (smart contracts), Node 20 / React 18 (frontend)
**Primary Dependencies**: FastAPI, anthropic-sdk, web3.py, sqlite3, Thirdweb SDK (x402), Self Protocol SDK, hardhat (contracts), Vite + React (frontend)
**Storage**: SQLite (local state — users, check-ins, baselines, alerts, bookings), Celo Alfajores (consent records, payment receipts, agent identity)
**Testing**: pytest (backend), hardhat test (contracts), Vitest (frontend)
**Target Platform**: Linux/macOS server (demo), Celo Alfajores testnet
**Project Type**: Web application (bilingual React frontend + Python API backend + Solidity contracts)
**Performance Goals**: Check-in delivery < 2s; alert dispatch < 60s; booking + payment confirmation < 90s
**Constraints**: Hackathon MVP — minimal surface area, no real funds, Alfajores testnet only, single deployment target
**Scale/Scope**: Demo scale (< 100 users), 8 demo flow steps, 2 subscription tiers

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I — API-First Design ✅

All internal service boundaries are defined as REST contracts under `specs/001-breso-depression-agent/contracts/` before implementation. Three contracts cover all system seams:
- `agent-api.yaml` — FastAPI backend REST contract (all frontend-to-backend calls)
- `on-chain-events.yaml` — Contract events emitted by Solidity contracts (consent, payment, agent registration)
- `notification-schema.yaml` — Alert message schema for trusted contact notifications

### Principle II — Observability-First ✅

Every LLM call to Claude API is logged with: model ID, prompt tokens, completion tokens, latency ms, outcome. A structured log schema (`BresoLLMLog`) is defined in the data model. Each alert dispatch, payment initiation, and booking confirmation generates a structured INFO log with correlation ID. Five key metrics are defined: check-in delivery rate, LLM latency p95, alert dispatch latency, payment confirmation latency, baseline computation frequency.

### Principle III — Simplicity & YAGNI ✅

Three services only: `agent` (FastAPI), `contracts` (Hardhat), `frontend` (Vite/React). No microservices, no message queues, no caching layers. SQLite chosen over PostgreSQL — sufficient for hackathon scale. Personalization profile stored as JSON in SQLite (no separate vector store). One LLM provider (Claude) accessed via a single `llm_client.py` abstraction.

### Principle IV — AI Reliability & Graceful Degradation ✅

Every Claude API call has a defined fallback: check-in prompt falls back to a hardcoded bilingual template when LLM is unavailable; tone analysis falls back to `0.0` (neutral) with a warning log. Prompt versions are tracked in `prompts/` directory as versioned YAML files. Rate limit errors are caught and surfaced as retryable (HTTP 429 → retry with backoff, not fatal). Non-deterministic LLM outputs pass through a sanitization step before storage or delivery.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-breso-depression-agent/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── agent-api.yaml
│   ├── on-chain-events.yaml
│   └── notification-schema.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
agent/                          # Python FastAPI backend + AI agent
├── main.py                     # FastAPI app entry point
├── routers/
│   ├── users.py                # User registration, profile
│   ├── checkins.py             # Daily check-in delivery + response
│   ├── alerts.py               # Alert detection + dispatch
│   ├── contacts.py             # Trusted contact management
│   ├── bookings.py             # Consultation booking + payment
│   └── subscriptions.py        # Subscription plan management
├── services/
│   ├── llm_client.py           # Claude API abstraction (single entry point)
│   ├── pattern_analyzer.py     # Behavioral baseline + anomaly detection
│   ├── alert_dispatcher.py     # Alert generation + contact notification
│   ├── booking_agent.py        # Autonomous booking + x402 payment
│   ├── personalization.py      # Profile building + activity proposals
│   └── scheduler.py            # Daily check-in scheduler
├── integrations/
│   ├── celo_client.py          # web3.py wrapper for Celo Alfajores
│   ├── self_protocol.py        # Self Protocol ZK verification
│   └── agentscan.py            # AgentScan query helper (read-only)
├── prompts/
│   ├── checkin_v1.yaml         # Check-in prompts (ES + EN) — versioned
│   ├── tone_analysis_v1.yaml   # Tone scoring prompts — versioned
│   └── alert_message_v1.yaml   # Alert message generation — versioned
├── models/
│   └── db.py                   # SQLite schema + ORM (SQLModel/SQLite3)
├── db.sqlite                   # Local state (gitignored)
└── requirements.txt

contracts/                      # Solidity smart contracts
├── BRESOAgentRegistry.sol      # ERC-8004 agent identity registration
├── ConsentRegistry.sol         # Immutable consent records on-chain
├── scripts/
│   ├── deploy.ts               # Deploy all contracts to Alfajores
│   └── register-agent.ts       # Register BRESO identity after deploy
├── test/
│   └── BRESOContracts.test.ts
└── hardhat.config.ts

frontend/                       # React + Vite demo UI
├── src/
│   ├── pages/
│   │   ├── Onboarding.tsx      # Bilingual onboarding (ES/EN)
│   │   ├── CheckIn.tsx         # Daily check-in interface
│   │   ├── Dashboard.tsx       # User wellness dashboard
│   │   ├── ContactSetup.tsx    # Trusted contact + ZK verification
│   │   ├── Subscription.tsx    # Plan selection + x402 payment
│   │   └── AgentProfile.tsx    # BRESO on-chain identity (AgentScan link)
│   ├── components/
│   │   ├── ConversationBox.tsx # Chat UI for check-ins
│   │   ├── AlertBanner.tsx     # Crisis numbers, alert status
│   │   └── PaymentModal.tsx    # x402 USDT payment widget
│   ├── services/
│   │   └── api.ts              # Typed API client (generated from contract)
│   ├── i18n/
│   │   ├── es.json             # Spanish strings
│   │   └── en.json             # English strings
│   └── main.tsx
└── package.json
```

**Structure Decision**: Web application (Option 2 from template). Three independent projects (`agent/`, `contracts/`, `frontend/`) in the repo root. Each can be run, tested, and demoed independently — critical for hackathon flow.

---

## Complexity Tracking

> Justified deviations from Principle III (Simplicity & YAGNI)

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|-----------|--------------------------------------|
| Solidity contracts (ConsentRegistry + BRESOAgentRegistry) | Mandatory Celo integrations: ERC-8004 agent identity + immutable consent records are explicit requirements | Storing consent in SQLite only would violate FR-007 and FR-013 (on-chain immutability) |
| 5 conversation modes (Listen, Motivate, Propose, Celebrate, Silent Alert) | Personalization differentiator — required by spec; different modes drive different prompts and response strategies | Single prompt template cannot express the behavioral variation needed for pattern detection |
| Personalization profile as JSON blob | Required to build the "more accurate every week" behavioral profile with interests, routines, hobbies | Separate profile microservice or vector DB is over-engineered for hackathon scale; JSON in SQLite is sufficient for demo |
| Self Protocol integration | Mandatory per spec (ZK contact verification); cannot be replaced by simpler email confirmation as it's a listed integration | Standard OAuth/email verification does not provide ZK age proof |

---

## Demo Flow Priority

The following 8 steps define the hackathon demo sequence. Implementation MUST be completable in this order — each step must be independently demonstrable.

| Step | Feature | Tier | Key Integration |
|------|---------|------|----------------|
| 1 | User onboarding (EN + ES, language auto-detect) | Essential | React i18n |
| 2 | Profile building (first conversation, interests captured) | Essential | Claude API |
| 3 | Daily check-in with personalization | Essential | Claude API, SQLite |
| 4 | Alert detection → trusted contact notification | Essential | Pattern analyzer |
| 5 | Professional coordination decision tree | Premium | Booking agent |
| 6 | USDT subscription payment via x402 | Both | Thirdweb x402, Celo |
| 7 | On-chain agent registration visible in AgentScan | Both | ERC-8004, 8004scan.io |
| 8 | Self Protocol ZK verification of trusted contact | Essential | Self Protocol SDK |

---

## Alert System Design

### Level 1 — Yellow (Mild)

- **Trigger**: 3–4 days of mild signals (tone_score < baseline - 1σ, or engagement drop)
- **Action**: Internal only — BRESO increases check-in frequency (no external notification)
- **User visibility**: Subtle UI indicator

### Level 2 — Orange (Moderate)

- **Trigger**: 5–7 days sustained mild signals, or sudden moderate drop (> 2σ)
- **Action**: Notify trusted contact via email/notification
- **Message template**: "Tu [relación] puede necesitar apoyo esta semana. Un mensaje tuyo podría marcar la diferencia. No es necesario que menciones que te contacté."
- **On-chain**: Alert event emitted on Celo (visible on AgentScan)

### Level 3 — Red (Crisis)

- **Trigger**: High-risk keyword detection, 48h no-response, or > 3σ deviation
- **Action**: Crisis protocol — show country crisis numbers, urgent contact notification, professional notification if registered
- **Crisis numbers**: AR:135, MX:800-290-0024, CO:106, CL:600-360-7577, ES:024, US:988
- **Access**: Available on ALL subscription plans regardless of tier

---

## Subscription Plans

### Essential — $5 USDT/month

| Feature | Detail |
|---------|--------|
| Daily check-in | 1 per day, all 5 conversation modes |
| History | 30 days |
| Activity proposals | 3x per week (personalized) |
| Trusted contacts | 1 (Level 1 + 2 alerts only) |
| Extras | Gratitude journal, breathing exercises, medication reminders (time only), motivational content, crisis numbers, bilingual |

### Premium — $12 USDT/month

| Feature | Detail |
|---------|--------|
| Check-ins | Unlimited |
| History | Full (no limit) |
| Trusted contacts | 2 (all 3 alert levels) |
| Coordination | Full decision tree: own professional / insurance network / BRESO network |
| Payment | x402 USDT for first consultation |
| Analysis | Weekly pattern summary, personal goals tracking, "Start over" mode |
| Reports | Monthly wellness report, anonymous therapist report |
| Support intensification | "Tough week" mode auto-activation |

---

## LLM Integration Points

All LLM calls go through `agent/services/llm_client.py`. Prompt versions tracked in `agent/prompts/*.yaml`.

| Call | Prompt File | Fallback |
|------|------------|---------|
| Daily check-in message generation | `checkin_v1.yaml` | Hardcoded bilingual template |
| Response tone analysis | `tone_analysis_v1.yaml` | `tone_score = 0.0` (neutral) + WARN log |
| Personalization profile update | Inline (low-risk) | Skip update, log WARN |
| Alert message generation for contact | `alert_message_v1.yaml` | Hardcoded template (non-alarmist) |
| Activity proposal generation | Inline | 3 static suggestions from profile tags |

---

## On-Chain Architecture

### Contracts (Celo Alfajores)

**BRESOAgentRegistry.sol**
- Implements ERC-8004 agent identity standard
- Deployed once at `contracts/scripts/deploy.ts`
- Stores: agent name, version, wallet, description, metadata URI
- Visible on AgentScan automatically after deployment

**ConsentRegistry.sol**
- Append-only event log: `ConsentUpdated(userId, payloadHash, threshold, timestamp)`
- Called by BRESO agent wallet on every consent create/update/revoke
- No personal data on-chain — only hashed payloads and threshold values

### x402 Payment Flow

1. User selects subscription plan in frontend
2. Frontend calls `POST /subscriptions/initiate` → returns payment intent
3. Backend calls Thirdweb x402 SDK to create autonomous payment request
4. User approves wallet transaction in frontend (MetaMask / WalletConnect)
5. x402 confirms USDT transfer on Celo Alfajores
6. Backend activates subscription, records `payment_tx_hash`
7. Consultation payment: same flow, triggered autonomously by `booking_agent.py` without frontend

---

## Observability Plan

All structured logs use JSON format. Fields: `timestamp`, `level`, `feature`, `correlation_id`, `event`, `details`.

### Key Log Events

| Event | Level | Fields |
|-------|-------|--------|
| `checkin.sent` | INFO | user_id, scheduled_at, language |
| `checkin.response_processed` | INFO | user_id, word_count, tone_score, delay_s, llm_latency_ms, prompt_version, model_id |
| `llm.call` | INFO | call_type, model_id, prompt_tokens, completion_tokens, latency_ms, outcome |
| `llm.fallback_triggered` | WARN | call_type, reason, fallback_used |
| `baseline.updated` | INFO | user_id, checkins_count, avg_tone, tone_stddev |
| `alert.triggered` | INFO | user_id, severity, dimensions, deviation_summary |
| `alert.sent` | INFO | user_id, contact_id, delivery_status |
| `payment.initiated` | INFO | user_id, amount_usdt, tx_hash_pending |
| `payment.confirmed` | INFO | user_id, tx_hash, block_number |
| `payment.failed` | ERROR | user_id, reason, retry_count |
| `booking.confirmed` | INFO | booking_id, professional_id, consultation_at |
| `consent.on_chain` | INFO | user_id, tx_hash, action_type |
