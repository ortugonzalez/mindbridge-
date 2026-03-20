# Data Model: BRESO — AI Mental Wellness Agent

**Feature Branch**: `001-breso-depression-agent`
**Created**: 2026-03-20
**Updated**: 2026-03-20 (expanded for subscription model, personalization engine, bilingual support)
**Source**: Derived from `spec.md` entities, FR-001–FR-017, and expanded design input

---

## Entity Definitions

### 1. User

Represents a registered individual using BRESO for daily mental wellness monitoring.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| created_at | ISO 8601 datetime | Registration timestamp |
| language | enum: `es`, `pt` | Preferred check-in language |
| timezone | IANA timezone string | Used to schedule daily check-in |
| checkin_time_preference | time (HH:MM) | Preferred daily check-in time |
| baseline_ready | boolean | True when ≥7 check-ins completed |
| wallet_address | string (0x…) | Celo Alfajores wallet for on-chain ops |
| consent_tx_hash | string | Latest on-chain consent record tx hash |

**Relationships**:
- Has one `TrustedContact`
- Has many `CheckIn`
- Has one `BehavioralBaseline` (once baseline_ready = true)
- Referenced by `ConsultationBooking`

---

### 2. CheckIn

A single daily interaction event. Raw message content is never persisted — only derived metrics.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| scheduled_at | ISO 8601 datetime | When check-in was due |
| responded_at | ISO 8601 datetime | Nullable — null if no response |
| response_delay_seconds | integer | Nullable — seconds from delivery to response |
| word_count | integer | Nullable — word count of response |
| tone_score | float (-1.0 to 1.0) | Nullable — AI-derived sentiment: -1 very negative, +1 very positive |
| engagement_flag | boolean | True if responded, False if non-response |
| prompt_version | string | Version tag of the check-in prompt used |
| llm_model_id | string | Model ID used for tone analysis |
| llm_latency_ms | integer | LLM call duration for observability |
| llm_tokens_prompt | integer | Prompt tokens used |
| llm_tokens_completion | integer | Completion tokens used |

**State**: Immutable once created. No update path — new check-in per day only.

---

### 3. BehavioralBaseline

Aggregated anonymized profile built from a user's check-in history. Updated after each new check-in once established.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User (unique) |
| computed_at | ISO 8601 datetime | Last recomputation timestamp |
| checkins_count | integer | Number of check-ins in baseline window |
| avg_tone_score | float | Rolling average tone |
| tone_stddev | float | Standard deviation — used for anomaly detection |
| avg_response_delay_seconds | float | Rolling average response delay |
| delay_stddev | float | Standard deviation |
| avg_word_count | float | Rolling average word count |
| wordcount_stddev | float | Standard deviation |
| engagement_rate | float (0.0–1.0) | Ratio of responded check-ins in window |

**State transitions**:
- Created when user completes 7th check-in
- Updated (not replaced) after each subsequent check-in

---

### 4. Alert

A welfare notification sent to the trusted contact when a concerning pattern is detected.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| triggered_at | ISO 8601 datetime | When pattern threshold was crossed |
| severity_level | enum: `mild`, `moderate`, `high` | Matches user-configured threshold |
| triggering_dimensions | JSON array of strings | e.g., `["tone", "response_delay"]` |
| deviation_summary | JSON | Anonymized delta stats (no raw content) |
| contact_notified_at | ISO 8601 datetime | Nullable — when message was sent |
| contact_message_hash | string | Hash of the sent message (for audit, not content) |
| booking_initiated | boolean | Whether consultation booking was triggered |
| on_chain_tx_hash | string | Nullable — tx hash of on-chain alert record |

**State transitions**:
1. `pending` → alert detected, not yet sent
2. `sent` → contact notified
3. `booking_triggered` → FR-011 consultation booking initiated
4. `resolved` → booking confirmed or manual resolution

---

### 5. TrustedContact

A verified individual pre-authorized by the user to receive alerts.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User (unique) |
| contact_email | string | For alert delivery |
| relationship_label | string | e.g., "mother", "friend" (user-defined label) |
| zk_verified | boolean | True once Self Protocol proof completes |
| zk_verification_at | ISO 8601 datetime | Nullable |
| zk_age_range_confirmed | boolean | True = contact is adult (≥18) |
| alert_threshold | enum: `mild`, `moderate`, `high` | User-configured trigger level |
| active | boolean | False until zk_verified = true |
| wallet_address | string | Nullable — Celo address for ZK proof anchoring |

---

### 6. ConsentRecord

Immutable on-chain record of user consent preferences. Each update creates a new on-chain entry; previous records are never deleted.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Local reference |
| user_id | UUID | FK → User |
| recorded_at | ISO 8601 datetime | Local timestamp |
| on_chain_tx_hash | string | Celo Alfajores transaction hash |
| block_number | integer | Block number of confirmation |
| action_type | enum: `create`, `update`, `revoke` | Type of consent change |
| payload_hash | string | Hash of consent data (not the data itself) |
| contact_wallet | string | Contact's wallet address at time of consent |
| threshold_at_consent | enum: `mild`, `moderate`, `high` | Threshold value recorded on-chain |

---

### 7. MentalHealthProfessional

Static directory entry for MVP. Populated at deploy time.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | Display name |
| language | enum: `es`, `pt` | Consultation language |
| region | string | e.g., "MX", "BR", "CO" |
| consultation_rate_usdt | float | Price of first consultation in USDT |
| available | boolean | Availability flag (manually managed for MVP) |
| contact_info | string | Booking endpoint / contact detail |

---

### 8. ConsultationBooking

Confirmed appointment linking user to professional, with on-chain payment proof.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| alert_id | UUID | FK → Alert (the triggering alert) |
| user_id | UUID | FK → User |
| professional_id | UUID | FK → MentalHealthProfessional |
| initiated_at | ISO 8601 datetime | When agent started booking process |
| confirmed_at | ISO 8601 datetime | Nullable — when booking was confirmed |
| consultation_datetime | ISO 8601 datetime | Scheduled consultation time |
| payment_tx_hash | string | Celo Alfajores USDT payment tx hash |
| payment_amount_usdt | float | Amount paid |
| payment_status | enum: `pending`, `confirmed`, `failed` | x402 payment state |
| booking_status | enum: `initiated`, `confirmed`, `failed` | Overall booking state |
| failure_reason | string | Nullable — populated on failure |

---

### 9. AgentIdentity

BRESO's ERC-8004 on-chain identity. A single record — created at deploy time.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Local reference |
| nft_token_id | string | ERC-8004 NFT token ID on Celo Alfajores |
| contract_address | string | ERC-8004 registry contract address |
| registered_at | ISO 8601 datetime | Deployment timestamp |
| agent_wallet_address | string | BRESO's operational wallet |
| agent_name | string | "BRESO" |
| agent_version | string | Semantic version (e.g., "1.0.0") |

---

### 10. PersonalizationProfile

Evolving behavioral profile built from check-in conversations. Stored as structured JSON in SQLite.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User (unique) |
| updated_at | ISO 8601 datetime | Last update timestamp |
| interests | JSON array of strings | e.g., ["música", "running", "cocinar"] |
| hobbies | JSON array of strings | Activities user has mentioned enjoying |
| joy_triggers | JSON array of strings | Things that uplift the user |
| energy_drains | JSON array of strings | Things that drain the user |
| energy_by_hour | JSON object | hour (0–23) → level: "low"/"medium"/"high" |
| active_hours | JSON array of integers | Hours when user is most responsive |
| preferred_contact_style | enum: `direct`, `gentle`, `humorous` | Inferred from conversation patterns |
| checkins_contributing | integer | Number of check-ins that shaped this profile |

---

### 11. Subscription

Tracks the user's active subscription plan and payment state.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User (unique) |
| tier | enum: `essential`, `premium` | Active plan |
| status | enum: `active`, `expired`, `cancelled` | |
| started_at | ISO 8601 datetime | When subscription was activated |
| expires_at | ISO 8601 datetime | Renewal date |
| payment_tx_hash | string | Most recent x402 payment tx hash |
| payment_amount_usdt | float | Amount paid (5.0 or 12.0) |
| auto_renew | boolean | Default true |

---

### 12. Goal (Premium only)

Personal goals the user sets; BRESO follows up on progress.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| created_at | ISO 8601 datetime | |
| description | string | User-defined goal text (max 200 chars) |
| status | enum: `active`, `completed`, `abandoned` | |
| last_followup_at | ISO 8601 datetime | Nullable — when BRESO last asked about it |
| completed_at | ISO 8601 datetime | Nullable |

---

## Relationships Summary

```
User ──────────────────┬──── has many ──── CheckIn
                       ├──── has one ───── BehavioralBaseline
                       ├──── has one ───── PersonalizationProfile
                       ├──── has one ───── TrustedContact
                       ├──── has one ───── Subscription
                       ├──── has many ──── Alert
                       ├──── has many ──── ConsentRecord
                       ├──── has many ──── Goal (Premium only)
                       └──── has many ──── ConsultationBooking (via Alert)

Alert ─────────────────┴──── triggers ──── ConsultationBooking

ConsultationBooking ───────── references ── MentalHealthProfessional

AgentIdentity ─────────────── singleton ─── (one per deployment)
```

---

## State Transition Diagrams

### Alert States

```
[detected] → [pending] → [sent] → [booking_triggered] → [resolved]
                                 ↘ [failed] (if contact unreachable)

[booking_triggered] → [resolved] (booking confirmed)
                    ↘ [manual_required] (booking failed)
```

### ConsultationBooking States

```
[initiated] → [payment_pending] → [payment_confirmed] → [confirmed]
                                ↘ [payment_failed] → [failed]
```

---

## SQLite Schema Notes

- All UUIDs stored as TEXT in SQLite.
- All datetimes stored as TEXT in ISO 8601 format.
- JSON fields stored as TEXT (SQLite has no native JSON column type; application layer parses).
- `BehavioralBaseline` is the only entity with a meaningful update path; all others are append-only.
- No raw message content stored anywhere — per FR-010 and privacy design.
