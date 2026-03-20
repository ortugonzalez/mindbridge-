# Research: BRESO — AI Mental Wellness Agent

**Feature Branch**: `001-breso-depression-agent`
**Created**: 2026-03-20
**Purpose**: Resolve all technical unknowns before Phase 1 design. All NEEDS CLARIFICATION markers resolved here.

---

## 1. ERC-8004 — On-Chain Agent Identity Standard

**Decision**: Use ERC-8004 on Celo Alfajores to register BRESO as a verifiable on-chain agent with its own identity NFT.

**What it is**: ERC-8004 is a Celo-native standard (proposed during the Celo AI Agent ecosystem push) for registering AI agents as NFT-backed on-chain identities. The NFT encodes the agent's name, version, wallet address, and a metadata URI pointing to a JSON descriptor (typically on IPFS). Once registered, the agent's wallet address is linked to the NFT, and all transactions from that wallet are discoverable via AgentScan.

**Integration approach**:
- Deploy `BRESOAgentRegistry.sol` which implements the ERC-8004 interface.
- `register-agent.ts` Hardhat script mints the identity NFT at deploy time.
- Store the `tokenId` and `contractAddress` in `agent/.env` → used by `celo_client.py` to reference BRESO's identity in all on-chain calls.
- The metadata JSON (agent name, version, description, logo URL) is pinned to IPFS or stored as a base64 data URI for simplicity in the hackathon.

**Key package**: Standard ERC-721 extension; reference implementation available in the Celo ecosystem GitHub (`celo-org/celo-agent-standards`). For hackathon: write minimal Solidity implementing the required interface.

**Alternatives considered**: Skip on-chain identity registration → rejected because it's a mandatory integration requirement and the demo won't show up on AgentScan.

**Gotchas**:
- ERC-8004 may still be a draft standard as of early 2026; use the latest spec from the Celo ecosystem repo.
- Deployer wallet needs CELO (not USDT) for gas.
- Token metadata URI must be stable; use a data URI for hackathon to avoid IPFS dependency.

---

## 2. x402 Protocol (Thirdweb) — Autonomous USDT Payments on Celo

**Decision**: Use Thirdweb's x402 SDK for all USDT payment flows (subscription + consultation). Frontend handles wallet approval; backend handles autonomous consultation payments.

**What it is**: x402 is an HTTP-native payment protocol (inspired by the HTTP 402 "Payment Required" status code). Thirdweb's implementation wraps it as an SDK that enables AI agents to initiate and confirm micropayments on EVM chains without requiring a full wallet UI for every transaction. For subscription flows: user approves once; for consultation payments: BRESO agent wallet sends autonomously.

**Integration approach**:
- **Subscription payment** (requires user approval):
  1. Backend calls Thirdweb x402 SDK to create a payment intent (amount, token, recipient).
  2. Returns `x402_payload` to frontend.
  3. Frontend uses Thirdweb React SDK to present wallet approval.
  4. On confirmation, frontend sends `tx_hash` to backend `/subscriptions/confirm`.
- **Autonomous consultation payment** (no UI needed):
  1. `booking_agent.py` calls Thirdweb x402 SDK directly with the agent wallet's private key.
  2. Signs and broadcasts the USDT transfer from the agent wallet.
  3. Polls for confirmation; records `payment_tx_hash`.

**Key packages**:
- Backend: `thirdweb-sdk` (Python) — `pip install thirdweb-sdk`
- Frontend: `@thirdweb-dev/react`, `@thirdweb-dev/sdk` — `pnpm add @thirdweb-dev/react`

**USDT on Celo Alfajores**: Use the official Celo testnet USDT (cUSD is native; USDT bridged ERC20). For hackathon, deploy a mock ERC20 with `mint()` function OR use the Celo-deployed testnet USDT address. Confirm address in Thirdweb's Celo Alfajores dashboard.

**Celo Alfajores Chain ID**: `44787`

**Alternatives considered**: Direct ERC20 transfer via web3.py → rejected because x402 is a mandatory integration and adds the HTTP-native payment semantics expected by the demo.

**Gotchas**:
- Agent wallet must hold sufficient CELO for gas AND USDT for consultation payments.
- x402 payment intents expire; set a reasonable TTL (5 minutes) and handle expiry gracefully.
- For testnet: fund the agent wallet via Alfajores faucet + manually mint testnet USDT.

---

## 3. Self Protocol — Zero-Knowledge Identity Verification

**Decision**: Use Self Protocol SDK for ZK age + humanity verification of trusted contacts. Integration returns only a boolean proof result — no personal data stored.

**What it is**: Self Protocol is a ZK identity verification system that allows users to prove claims (age ≥18, unique human, nationality) from government-issued ID documents using zero-knowledge proofs. The SDK generates a QR code / deep link; the user scans their passport/ID via the Self mobile app; the app generates a ZK proof; Self Protocol returns a signed proof to a callback URL. BRESO receives only `{ proof_valid: true/false, age_verified: true/false, nullifier: "0x..." }`.

**Integration approach**:
1. Backend generates a verification request via Self Protocol SDK (scoped to `age_verification`).
2. Returns a verification URL/QR code to the frontend.
3. Frontend displays QR code to the trusted contact.
4. Contact completes verification on Self mobile app.
5. Self Protocol calls `POST /contacts/zk-callback` with the proof result.
6. Backend verifies the Self Protocol signature on the callback, then marks the contact as `zk_verified = true`.
7. **Nothing stored**: only the boolean result and the nullifier (for replay prevention).

**Key package**: `self-sdk` (npm) — `pnpm add @selfxyz/core` + Python REST integration for the backend callback.

**Scope**: `age_verification` — confirms contact is an adult. No document data, no name, no ID number stored.

**Alternatives considered**: Email verification only → rejected (mandatory ZK integration requirement). Full KYC → rejected (overkill, stores personal data, violates privacy design).

**Gotchas**:
- Self Protocol requires the user to have the Self mobile app installed.
- The callback URL must be publicly reachable (use ngrok in local dev).
- Nullifier prevents the same identity from registering as multiple contacts (replay protection).
- The `proof_valid` field must be validated against Self Protocol's public key — never trust the callback payload without signature verification.

---

## 4. Celo Agent Skills — Reusable Payment and Identity Primitives

**Decision**: Use Celo Agent Skills as pre-built composable action primitives for payment and identity workflows rather than writing raw contract calls.

**What it is**: Celo Agent Skills is an emerging framework (part of the Celo AI ecosystem) that provides standardized, reusable skill modules that AI agents can call to perform on-chain actions. Skills are essentially typed, composable RPC wrappers with standardized inputs/outputs. Relevant skills: `PayUSDT`, `VerifyIdentity`, `RegisterAgent`.

**Integration approach**:
- In `celo_client.py`, wrap Celo Agent Skills calls for:
  - `PayUSDT(to, amount)` → used inside `booking_agent.py` consultation payment flow.
  - `VerifyAgentIdentity(tokenId)` → used in health checks to confirm BRESO's registration.
- Skills are invoked as Python function calls after initializing the Celo Agent Skills client with the agent wallet.

**Key package**: `celo-agent-skills` (npm/Python) — check Celo ecosystem repo for current package name. For hackathon: if the Python package is not stable, call the underlying contracts directly via web3.py and document this as a simplification.

**Alternatives considered**: Direct web3.py contract calls → acceptable fallback if Celo Agent Skills SDK is not mature enough for hackathon timeline. Document the simplification in Complexity Tracking.

**Gotchas**:
- Celo Agent Skills is new territory — SDK may be in alpha. Have the web3.py fallback ready.
- Skills may require the agent to have a registered ERC-8004 identity to call them (dependency on step 1).

---

## 5. AgentScan (8004scan.io)

**Decision**: No active integration required. AgentScan indexes BRESO transactions automatically once the ERC-8004 agent identity is registered. BRESO only needs to expose the agent's NFT token ID for the frontend.

**What it is**: AgentScan (8004scan.io) is a block explorer specialized for ERC-8004 registered agents on Celo. Once BRESO's agent wallet is linked to its ERC-8004 NFT, all on-chain transactions from that wallet — consent updates, payment events, agent activity — are indexed and displayed on the agent's profile page at `https://8004scan.io/agent/{tokenId}`.

**Integration approach**:
- No SDK needed. BRESO's `GET /agent/identity` endpoint returns the AgentScan URL.
- Frontend **Agent** page deep-links to the AgentScan profile.
- Transactions appear automatically within ~60 seconds of on-chain confirmation.

**Alternatives considered**: Build a custom activity log → rejected (over-engineered; AgentScan provides this for free as part of the ERC-8004 ecosystem).

**Gotchas**:
- AgentScan may take 30–120 seconds to index new transactions.
- Alfajores testnet only. The mainnet equivalent (if different) is out of scope.

---

## 6. Celo Alfajores Testnet USDT

**Decision**: Use a mock ERC20 token deployed by BRESO for hackathon demo. Name it "USDT" with 6 decimals. Alternative: use Celo's cUSD (native stablecoin) if the x402 integration supports it.

**What it is**: Celo Alfajores does not have an official USDT deployment (USDT is a bridged asset on Celo mainnet). For hackathon purposes, deploy a simple mintable ERC20 named "tUSDT" (testnet USDT) with `decimals = 6`. Fund all test wallets via the `mint()` function.

**Approach**:
- Add `MockUSDT.sol` to contracts → deployed alongside the main contracts.
- Address stored in `USDT_CONTRACT_ADDRESS` env variable.
- All x402 payment calls reference this token address.

**Faucet for CELO gas**: https://faucet.celo.org/alfajores

**Alternatives considered**: cUSD (Celo's native stablecoin) → acceptable alternative, simpler since it's always available on Alfajores. If x402 supports cUSD, prefer it to avoid deploying a mock token.

---

## 7. Claude API Integration (AI Agent)

**Decision**: Use `claude-sonnet-4-6` via the Anthropic Python SDK as the primary LLM. All calls go through `agent/services/llm_client.py`.

**Key design decisions**:
- **Check-in prompt**: System prompt in `checkin_v1.yaml` instructs Claude to take on the BRESO persona — warm, supportive, non-clinical. Prompts are bilingual (ES/EN) based on user's language setting.
- **Tone analysis**: Separate call after each check-in response. Returns a JSON object `{ "tone_score": float, "valence": string }`. Sanitization step validates the float range (-1.0 to 1.0) before storing.
- **Personalization update**: Claude extracts interests/hobbies/patterns from responses and returns structured JSON to update `PersonalizationProfile`. Falls back gracefully if extraction fails.
- **Activity proposals**: Claude generates personalized suggestions (3–7 per batch) using the profile JSON as context.
- **Prompt versioning**: Each prompt file is YAML with a `version` field. The `checkin_v1.yaml` → `checkin_v2.yaml` convention; `CheckIn.prompt_version` records which version produced each result.

**Fallback chain**:
1. Primary: Claude API
2. If rate-limited (429): retry with exponential backoff (max 3 attempts)
3. If API unavailable: return hardcoded bilingual template
4. Tone analysis failure: store `tone_score = 0.0`, log WARN

**Model ID**: `claude-sonnet-4-6` (configurable via `ANTHROPIC_MODEL` env var)

---

## 8. Behavioral Pattern Detection Algorithm

**Decision**: Z-score anomaly detection on three dimensions. Simple, auditable, no ML framework needed.

**Algorithm**:
1. Maintain rolling baseline (last 30 check-ins, or all if < 30): `avg` and `stddev` for tone, delay, and word count.
2. For each new check-in, compute z-score: `z = (value - avg) / stddev` for each dimension.
3. Alert levels:
   - **Level 1 (mild)**: Any single dimension z-score ≤ -1.5 for 3–4 consecutive check-ins
   - **Level 2 (moderate)**: Two+ dimensions z-score ≤ -2.0, or sustained Level 1 for 5–7 days
   - **Level 3 (high/crisis)**: z-score ≤ -3.0 on any dimension, high-risk keyword detected, or 48h non-response
4. High-risk keyword list (versioned YAML): maintained in `agent/prompts/crisis_keywords_v1.yaml`. Keywords are in Spanish and English. Detection runs on the raw response text before it is discarded.

**Non-response handling**: Non-response increments a `no_response_streak` counter. At 2 consecutive non-responses → Level 1 flag. At 48h non-response (regardless of streak) → Level 3 trigger.

**Rationale**: Z-score is interpretable, requires no external ML library, works with the small dataset sizes expected in a hackathon demo, and produces auditable deviation values for the on-chain alert record.

---

## 9. Conversation Modes

The five BRESO conversation modes are implemented as distinct system prompt variants:

| Mode | Trigger | Behavior |
|------|---------|---------|
| **Listen** | User seems low energy or sad | Empathetic, short questions, no suggestions |
| **Motivate** | User seems stuck or demotivated | Gentle encouragement, highlight past positives from profile |
| **Propose** | User seems receptive, energy medium+ | Suggest 1–2 personalized activities from profile |
| **Celebrate** | User shares positive news or achievement | Warm acknowledgment, amplify the positive |
| **Silent Alert** | Level 1 detected | Normal tone externally; internally flags for monitoring; may probe gently |

Mode selection is determined by a lightweight classification call (separate from the check-in generation call). Classification returns the mode name as a JSON token — fast and cheap.

---

## Summary: All NEEDS CLARIFICATION Resolved

| Unknown | Resolution |
|---------|-----------|
| ERC-8004 contract interface | Deploy custom BRESOAgentRegistry.sol implementing ERC-8004 NFT standard |
| x402 payment initiation flow | Thirdweb SDK: user-signed for subscriptions, agent-signed for consultations |
| Self Protocol callback verification | Verify Self Protocol signature on `/contacts/zk-callback`; store boolean only |
| Celo Agent Skills SDK maturity | Use if stable Python SDK available; fallback to direct web3.py calls |
| Testnet USDT | Deploy MockUSDT.sol OR use cUSD if x402 supports it |
| Pattern detection algorithm | Z-score on 3 dimensions; crisis keyword list as versioned YAML |
| Conversation mode selection | Lightweight classification LLM call per check-in; returns mode enum |
