# Tasks: BRESO — Bilingual AI Mental Wellness Companion

**Input**: Design documents from `specs/001-breso-depression-agent/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story (P0–P6) to enable independent implementation and testing of each story.

**Data layer note**: spec.md v3 replaces SQLite with Supabase (PostgreSQL + Auth + Realtime + Storage + RLS). Tasks below reflect Supabase as the primary data layer. plan.md tech context references should be read with this substitution applied.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story this task belongs to (US0–US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the three-project repository structure and verify all tooling is in place.

- [x] T001 Create top-level directory structure: `agent/`, `contracts/`, `frontend/` at repo root
- [x] T002 [P] Initialize Python 3.11 virtualenv and `agent/requirements.txt` with FastAPI, uvicorn, anthropic, supabase-py, web3, python-dotenv, pydantic
- [x] T003 [P] Initialize Hardhat project in `contracts/` with `hardhat.config.ts` configured for Celo Alfajores (chainId 44787, RPC: `https://alfajores-forno.celo-testnet.org`)
- [x] T004 [P] Initialize Vite + React 18 + TypeScript project in `frontend/` with pnpm; add `@supabase/supabase-js`, `@thirdweb-dev/react`, `react-i18next`, `react-router-dom`
- [x] T005 [P] Create `agent/.env.example` with all required environment variables: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `CELO_RPC_URL`, `BRESO_AGENT_WALLET_PRIVATE_KEY`, `BRESO_AGENT_WALLET_ADDRESS`, `ERC8004_CONTRACT_ADDRESS`, `CONSENT_REGISTRY_ADDRESS`, `USDT_CONTRACT_ADDRESS`, `THIRDWEB_SECRET_KEY`, `SELF_PROTOCOL_APP_ID`, `SECRET_KEY`, `LOG_LEVEL`
- [x] T006 [P] Create `frontend/.env.example` with: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
- [x] T007 [P] Create `contracts/.env.example` with: `CELO_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ERC8004_CONTRACT_ADDRESS`, `CONSENT_REGISTRY_ADDRESS`
- [x] T008 Create root `README.md` referencing `specs/001-breso-depression-agent/quickstart.md` for setup instructions

**Checkpoint**: All three projects initialize without errors. `pnpm dev`, `uvicorn main:app`, and `npx hardhat compile` all run successfully.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T009 Create Supabase project (via Supabase dashboard) and record `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY` — add to `agent/.env` and `frontend/.env`
- [x] T010 Write Supabase migration `agent/supabase/migrations/001_initial_schema.sql` creating all tables: `users`, `check_ins`, `behavioral_baselines`, `personalization_profiles`, `trusted_contacts`, `consent_records`, `alerts`, `subscriptions`, `goals`, `mental_health_professionals`, `consultation_bookings`, `agent_identity` — matching `data-model.md` entity definitions
- [x] T011 Write Supabase RLS policies in `agent/supabase/migrations/002_rls_policies.sql`: enable RLS on all tables; add per-table policies ensuring users can only SELECT/INSERT/UPDATE/DELETE their own rows (authenticated user's UUID = row's `user_id`)
- [x] T012 Apply migrations to Supabase: run `supabase db push` or apply via Supabase dashboard SQL editor; verify tables and RLS policies are active
- [x] T013 Create `agent/main.py`: FastAPI app entry point with CORS configured for `localhost:5173`, structured JSON logging middleware, and `/health` endpoint returning `{"status": "ok", "version": "1.0.0"}`
- [x] T014 [P] Create `agent/services/llm_client.py`: single LLM abstraction wrapping the Anthropic SDK. Methods: `generate_checkin_message(user_id, mode, profile)`, `analyze_tone(text)`, `generate_alert_message(relationship_label, lang)`, `extract_profile_update(text, current_profile)`. Each method logs: model ID, prompt tokens, completion tokens, latency ms, outcome. Returns fallback on any exception.
- [x] T015 [P] Create `agent/prompts/` directory; add `checkin_v1.yaml` (bilingual ES/EN check-in system prompt, version field, 5 mode variants), `tone_analysis_v1.yaml` (returns JSON `{"tone_score": float, "valence": string}`), `alert_message_v1.yaml` (non-alarmist bilingual template)
- [x] T016 [P] Create `agent/integrations/celo_client.py`: web3.py wrapper for Celo Alfajores. Methods: `send_consent_event(user_id_hash, payload_hash, threshold, contact_wallet)`, `send_payment(to, amount_usdt)`, `get_transaction_status(tx_hash)`. Reads wallet from env; handles gas estimation.
- [x] T017 [P] Create `frontend/src/lib/supabase.ts`: initialize Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; export typed client
- [x] T018 [P] Create `frontend/src/i18n/` with `es.json` and `en.json` (empty shells with keys for all UI strings) and `frontend/src/i18n/index.ts` configuring `react-i18next` with browser language detection (default: `es`)
- [x] T019 Create `frontend/src/services/api.ts`: typed API client with `baseURL` from `VITE_API_BASE_URL`; adds Supabase JWT auth header to all requests automatically; handles 401 by redirecting to sign-in
- [x] T020 Create `agent/routers/__init__.py` and register all routers in `main.py`: `users`, `checkins`, `alerts`, `contacts`, `bookings`, `subscriptions`, `auth` (stubs initially — filled per user story)
- [x] T021 [P] Create `frontend/src/components/Layout.tsx`: root layout with header (BRESO logo, language switcher, sign-out button) and `<Outlet />` for pages; language switcher toggles `react-i18next` locale between `es` and `en`
- [x] T022 [P] Create `frontend/src/router.tsx`: React Router config with routes for `/`, `/signin`, `/dashboard`, `/checkin`, `/contacts`, `/subscription`, `/agent`, `/contact-dashboard/:token`; wrap protected routes in `<AuthGuard />`
- [x] T023 Create `frontend/src/components/AuthGuard.tsx`: checks Supabase session; redirects unsigned users to `/signin`

**Checkpoint**: Foundation ready. `GET /health` returns 200. Supabase tables exist with RLS. Frontend compiles and shows layout with language switcher.

---

## Phase 3: User Story 0 — Account Access (Priority: P0)

**Goal**: Users can register, sign in via email/password or magic link, and access only their own data.

**Independent Test**: Register a new email → receive magic link → click link → reach dashboard. Then attempt to access another user's data via the API and confirm rejection (403/empty result).

- [x] T024 [US0] Implement Supabase Auth sign-up in `agent/routers/auth.py`: `POST /auth/register` accepts `{email, password, language, timezone}`, calls Supabase Auth to create user, inserts matching row into `users` table with `user_id = supabase_auth_uid`
- [x] T025 [US0] Implement `POST /auth/signin` in `agent/routers/auth.py`: email/password sign-in via Supabase Auth; returns session JWT and user profile
- [x] T026 [US0] Implement `POST /auth/magic-link` in `agent/routers/auth.py`: calls Supabase Auth `signInWithOtp(email)`; returns `{"message": "Check your inbox"}`. Link expires in 15 minutes (configured in Supabase dashboard → Auth settings).
- [x] T027 [P] [US0] Create `frontend/src/pages/SignIn.tsx`: bilingual sign-in page with two tabs — "Email & Password" and "Magic Link". Password tab: email + password fields + submit. Magic link tab: email field + "Send link" button. Handles errors from API gracefully with user-facing messages in selected language.
- [x] T028 [P] [US0] Create `frontend/src/pages/Onboarding.tsx`: post-signup screen shown on first login. Lets user set language preference (`es`/`en`), timezone (dropdown), and preferred check-in time (HH:MM picker). Submits to `PATCH /users/me` and redirects to `/dashboard`.
- [x] T029 [US0] Implement `GET /users/me` and `PATCH /users/me` in `agent/routers/users.py`: reads/updates authenticated user's row. RLS on Supabase ensures only the user's own row is returned.
- [x] T030 [US0] Add session expiry: configure Supabase Auth JWT expiry to 7 days. Add `frontend/src/hooks/useSession.ts` that subscribes to Supabase `onAuthStateChange` and redirects to `/signin` on `SIGNED_OUT` event.
- [x] T031 [US0] Verify data isolation: add a Supabase RLS integration test (via `supabase/tests/rls_isolation.sql`) that attempts to SELECT rows of user B from a session authenticated as user A — asserts 0 rows returned. Document result in `specs/001-breso-depression-agent/checklists/requirements.md`.

**Checkpoint**: A new user can register, receive a magic link, sign in, complete onboarding, and reach the dashboard. Unauthenticated routes redirect to `/signin`. Cross-user data access returns no results.

---

## Phase 4: User Story 1 — Daily Conversational Check-In (Priority: P1) 🎯 MVP

**Goal**: Registered users receive a daily bilingual check-in from BRESO, respond naturally, and see their behavioral metrics accumulate. BRESO adapts its conversation mode based on recent patterns.

**Independent Test**: Complete 3 check-ins with different emotional tones → verify that `check_ins` table contains anonymized metrics (no raw text), conversation mode changes across check-ins, and the behavioral baseline begins forming after check-in 7.

- [x] T032 [P] [US1] Create Supabase DB types in `agent/models/types.py`: Pydantic models for `User`, `CheckIn`, `BehavioralBaseline` matching `data-model.md` schema
- [x] T033 [P] [US1] Implement conversation mode selector in `agent/services/pattern_analyzer.py`: function `select_conversation_mode(user_id) -> ConversationMode` — queries last 3 check-ins from Supabase, applies mode selection logic (low tone → Listen, positive → Celebrate, medium → Propose/Motivate, Level 1 flag → Silent Alert)
- [x] T034 [US1] Implement `GET /checkins/today` in `agent/routers/checkins.py`: checks if a check-in exists for today; if not, calls `llm_client.generate_checkin_message()` with the selected mode and user's personalization profile; inserts a `CheckIn` row with `responded_at = null`; returns the message and `checkin_id`
- [x] T035 [US1] Implement `POST /checkins/respond` in `agent/routers/checkins.py`: receives `{checkin_id, response_text}`; calls `llm_client.analyze_tone(response_text)` to extract `tone_score`; computes `response_delay_seconds` and `word_count`; updates the `CheckIn` row with metrics; discards `response_text` immediately (never stored); triggers baseline update; returns `CheckInResult`
- [x] T036 [US1] Implement baseline update in `agent/services/pattern_analyzer.py`: function `update_baseline(user_id)` — fetches all `CheckIn` rows for user from Supabase; computes rolling avg + stddev for tone, delay, word count, engagement rate; upserts `behavioral_baselines` row; sets `users.baseline_ready = true` when `checkins_count >= 7`
- [x] T037 [US1] Implement `GET /checkins/history` in `agent/routers/checkins.py`: returns last N days of anonymized check-in metrics (no `response_text` field — never stored). Default `days=30`.
- [x] T038 [US1] Implement `GET /users/me/baseline` in `agent/routers/users.py`: returns the user's `BehavioralBaseline` or 404 if not yet ready
- [x] T039 [US1] Create `agent/services/scheduler.py`: APScheduler (or Supabase Edge Function) that runs daily at each user's `checkin_time_preference` (in their timezone) and calls the check-in delivery logic. Non-response after 24h is recorded as `engagement_flag = false`.
- [x] T040 [P] [US1] Create `frontend/src/pages/CheckIn.tsx`: check-in chat interface. On load, calls `GET /checkins/today`; displays BRESO's message; provides text input (max 4 turns per session); submits response via `POST /checkins/respond`; shows follow-up message if present. Bilingual placeholder text.
- [x] T041 [P] [US1] Create `frontend/src/pages/Dashboard.tsx`: user's home screen. Shows today's check-in status (completed/pending), a simple emotion trend graph from the last 7 check-ins (tone score over time), and quick-access cards for Check-in, Contacts, and Subscription.
- [x] T042 [US1] Populate `frontend/src/i18n/es.json` and `en.json` with all check-in and dashboard UI strings

**Checkpoint**: A user can complete a daily check-in in their language, see their tone history on the dashboard, and the baseline begins forming after 7 check-ins. No raw message text appears anywhere in the database.

---

## Phase 5: User Story 2 — Personalization Engine (Priority: P2)

**Goal**: BRESO extracts interests, energy patterns, and hobbies from check-in responses and uses them to generate personalized activity proposals and adaptive check-in messages.

**Independent Test**: Complete 5 check-ins mentioning different topics (music, running, cooking) → query `GET /users/me/personalization` → verify at least 3 interests are captured → trigger a "Propose" mode check-in → verify the proposed activity references one of the captured interests.

- [ ] T043 [P] [US2] Create Pydantic model for `PersonalizationProfile` in `agent/models/types.py` matching `data-model.md`: fields for `interests`, `hobbies`, `joy_triggers`, `energy_drains`, `energy_by_hour` (JSON), `active_hours`, `preferred_contact_style`
- [ ] T044 [US2] Implement profile extraction in `agent/services/personalization.py`: function `extract_and_update_profile(user_id, response_text, tone_score)` — calls `llm_client.extract_profile_update()` with the response text (before discarding it) and current profile JSON; merges extracted data into `personalization_profiles` row in Supabase; falls back gracefully on LLM failure (log WARN, skip update)
- [ ] T045 [US2] Hook profile extraction into `POST /checkins/respond` in `agent/routers/checkins.py`: call `extract_and_update_profile()` before `response_text` is discarded; this is the only window where raw text is available
- [ ] T046 [US2] Implement `GET /users/me/personalization` in `agent/routers/users.py`: returns the user's `PersonalizationProfile` from Supabase (empty profile with defaults if no check-ins yet)
- [ ] T047 [US2] Implement activity proposal generation in `agent/services/personalization.py`: function `generate_proposals(user_id, count=3) -> list[str]` — fetches profile from Supabase; calls Claude with the profile JSON in context; returns `count` personalized suggestions. Fallback: return 3 static suggestions from `prompts/activity_fallbacks_v1.yaml`.
- [ ] T048 [US2] Create `agent/prompts/activity_fallbacks_v1.yaml`: 10 generic bilingual (ES/EN) activity suggestions used when LLM is unavailable or profile is empty
- [ ] T049 [US2] Add optimal-time scheduling to `agent/services/scheduler.py`: after each profile update, recalculate `active_hours` from `energy_by_hour` and update the user's check-in delivery time in `users.checkin_time_preference` if a better time is identified
- [ ] T050 [P] [US2] Create `frontend/src/pages/Dashboard.tsx` update: add a "Personalized for you" section showing 1–3 activity proposals (fetched from `GET /users/me/personalization` + a new `GET /proposals` endpoint). Mark proposals with an icon indicating they're based on the user's profile.
- [ ] T051 [US2] Implement `GET /proposals` in `agent/routers/checkins.py`: calls `personalization.generate_proposals()` and returns the list. Essential: max 3 proposals. Premium: up to 7 daily proposals (gated by subscription tier check).

**Checkpoint**: After 5 check-ins, the personalization profile has captured at least 3 interests. The next "Propose" mode check-in references one of those interests specifically. Dashboard shows personalized proposals.

---

## Phase 6: User Story 3 — Subscription Tiers and Payments (Priority: P3)

**Goal**: Users subscribe to Essential ($5/mo) or Premium ($12/mo) via x402 USDT payment on Celo. Feature access is correctly gated by tier. Crisis resources are available to all tiers.

**Independent Test**: Subscribe to Essential → verify feature gating (2nd contact blocked, weekly analysis blocked) → upgrade to Premium → verify Premium features unlock immediately. Confirm subscription payment appears as a transaction on Celo Alfajores.

- [ ] T052 [P] [US3] Create Pydantic model for `Subscription` in `agent/models/types.py`: fields `tier`, `status`, `started_at`, `expires_at`, `payment_tx_hash`, `payment_amount_usdt`
- [ ] T053 [P] [US3] Create `agent/services/subscription_service.py`: functions `get_active_subscription(user_id)`, `activate_subscription(user_id, tier, tx_hash)`, `is_premium(user_id) -> bool`, `check_feature_gate(user_id, feature_name) -> bool`. Feature gate map: `{"second_contact": "premium", "unlimited_checkins": "premium", "weekly_analysis": "premium", "professional_coordination": "premium", "goals": "premium", "reports": "premium", "tough_week_mode": "premium"}`
- [ ] T054 [US3] Implement `GET /subscriptions/status` in `agent/routers/subscriptions.py`: returns active subscription from Supabase or `{"active": false}` if none
- [ ] T055 [US3] Implement `POST /subscriptions/initiate` in `agent/routers/subscriptions.py`: accepts `{tier, wallet_address}`; calls Thirdweb x402 SDK to create a USDT payment intent for the correct amount ($5 or $12 in USDT, 6 decimals); returns `SubscriptionPaymentIntent` including `x402_payload` for the frontend wallet widget
- [ ] T056 [US3] Implement `POST /subscriptions/confirm` in `agent/routers/subscriptions.py`: receives `{payment_intent_id, tx_hash}`; verifies the transaction on Celo Alfajores via `celo_client`; on confirmation, calls `subscription_service.activate_subscription()`; upserts `subscriptions` row in Supabase; logs `payment.confirmed` event
- [ ] T057 [US3] Add feature gate middleware to `agent/routers/checkins.py`: `POST /checkins/respond` — if Essential and daily check-in already completed, return 403 with upgrade prompt. `GET /proposals` — enforce Essential 3x/week cap.
- [ ] T058 [P] [US3] Create `frontend/src/pages/Subscription.tsx`: plan selection page with Essential and Premium cards showing features side-by-side (bilingual). On plan selection: shows Thirdweb x402 payment widget (wallet connect + USDT approval). On confirmation: calls `/subscriptions/confirm`, shows success state with plan name and next renewal date.
- [ ] T059 [P] [US3] Create `frontend/src/components/PaymentModal.tsx`: Thirdweb React SDK payment widget, pre-configured for Celo Alfajores (chainId 44787), USDT token address, and recipient wallet. Handles pending/confirmed/failed states with bilingual messages.
- [ ] T060 [US3] Deploy mock USDT ERC20 contract `contracts/MockUSDT.sol` to Celo Alfajores: standard ERC20 with `mint(address, amount)` function. Record address in env as `USDT_CONTRACT_ADDRESS`. Add `contracts/scripts/deploy-mock-usdt.ts`.
- [ ] T061 [US3] Populate `frontend/src/i18n/es.json` and `en.json` with all subscription and payment UI strings

**Checkpoint**: An Essential subscriber can pay $5 testnet USDT, see their subscription activate, and find Premium features blocked. The payment transaction is visible on Celo Alfajores block explorer.

---

## Phase 7: User Story 4 — Three-Level Alert System and Real-Time Contact Dashboard (Priority: P4)

**Goal**: BRESO detects behavioral deterioration at three levels and responds correctly: Level 1 internal, Level 2 contact notification, Level 3 crisis protocol. Trusted contacts see alerts in real time on their dashboard without page refresh.

**Independent Test**: Submit 5 check-ins with declining tone scores → verify Level 2 triggers and trusted contact email is sent within 60s → force a Level 3 trigger (keyword or 48h gap) → verify crisis numbers appear in the UI immediately and contact dashboard shows the alert in real time.

- [ ] T062 [P] [US4] Create Pydantic models for `Alert`, `TrustedContact` in `agent/models/types.py` matching `data-model.md`
- [ ] T063 [P] [US4] Implement Z-score anomaly detection in `agent/services/pattern_analyzer.py`: function `evaluate_alert_level(user_id) -> AlertLevel | None`. Computes z-scores for tone, delay, word count against `BehavioralBaseline`. Level 1: any dimension z ≤ -1.5 for 3–4 consecutive check-ins. Level 2: 2+ dimensions z ≤ -2.0, or sustained Level 1 for 5–7 days. Level 3: any dimension z ≤ -3.0, crisis keyword match, or 48h non-response streak. Returns `None` if baseline not yet ready.
- [ ] T064 [US4] Create crisis keyword list at `agent/prompts/crisis_keywords_v1.yaml`: bilingual (ES/EN) list of high-risk phrases. Loaded at startup and cached. Used in `pattern_analyzer.evaluate_alert_level()`.
- [ ] T065 [US4] Implement alert dispatch in `agent/services/alert_dispatcher.py`: function `dispatch_alert(user_id, level, dimensions, deviation_summary)` — creates `Alert` row in Supabase; for Level 2+: calls `llm_client.generate_alert_message()` (falls back to hardcoded template from `notification-schema.yaml`); sends email to trusted contact via Supabase Auth email or SMTP; writes on-chain event via `celo_client.send_consent_event()` for Level 2+; logs `alert.triggered` and `alert.sent` events.
- [ ] T066 [US4] Hook alert evaluation into `agent/services/scheduler.py`: after each check-in is processed and after each non-response window, call `evaluate_alert_level()` and `dispatch_alert()` if a level is returned. Level 1: set internal flag on user row; increase scheduler frequency to 2x/day.
- [ ] T067 [US4] Implement `GET /alerts` in `agent/routers/alerts.py`: returns list of alert summaries for authenticated user (anonymized — no health data, only level, timestamp, dimensions, booking status)
- [ ] T068 [US4] Create contact dashboard token system in `agent/routers/contacts.py`: when a trusted contact is added, generate a unique dashboard token stored in `trusted_contacts.dashboard_token`; include this token in the Level 2/3 notification email as a link to `/contact-dashboard/{token}`
- [ ] T069 [US4] Implement `GET /contact-dashboard/{token}` (public route, no auth required) in `agent/routers/contacts.py`: validates the token against `trusted_contacts` table; returns the contact's allowed alert view (level, timestamp, welfare message — no health data)
- [ ] T070 [US4] Enable Supabase Realtime on the `alerts` table (via Supabase dashboard → Replication → enable for `alerts`). The contact dashboard frontend subscribes to real-time inserts filtered by `user_id`.
- [ ] T071 [P] [US4] Create `frontend/src/pages/ContactDashboard.tsx`: read-only page accessible via dashboard token URL. Initializes Supabase Realtime subscription on the `alerts` channel filtered to the relevant `user_id`. Displays alerts as they arrive (no page refresh). Shows level badge (Yellow/Orange/Red), welfare message, and timestamp. Bilingual. Shows crisis numbers prominently if Level 3 is active.
- [ ] T072 [P] [US4] Update `frontend/src/pages/CheckIn.tsx`: add `AlertBanner` component that appears immediately when `GET /alerts` returns an active Level 3 alert. Banner shows country-appropriate crisis line numbers (fetched from `GET /crisis/numbers?country_code=XX`). Banner cannot be dismissed while Level 3 is active.
- [ ] T073 [US4] Implement `GET /crisis/numbers` in `agent/routers/alerts.py` (public, no auth): returns crisis numbers from `research.md` registry. Hardcoded: AR:135, MX:800-290-0024, CO:106, CL:600-360-7577, ES:024, USA:988. Fallback: IASP directory URL for unlisted countries.
- [ ] T074 [US4] Populate `frontend/src/i18n/es.json` and `en.json` with all alert, contact dashboard, and crisis number UI strings

**Checkpoint**: After simulated declining check-ins, Level 2 email is sent within 60s, contact dashboard shows alert in real time without refresh, Level 3 crisis banner appears immediately in the app.

---

## Phase 8: User Story 5 — Professional Coordination Decision Tree (Priority: P5)

**Goal**: Premium users walk through a structured decision tree to access professional mental health support. BRESO autonomously books and pays for the first consultation when the BRESO network path is selected.

**Independent Test**: As a Premium user with no registered professional, walk the full decision tree to the BRESO network path → confirm that a professional is selected from the directory, testnet USDT payment is initiated, and both user and trusted contact receive booking confirmation. (Requires active Premium subscription.)

- [ ] T075 [P] [US5] Seed `mental_health_professionals` table in Supabase with at least 5 demo professionals: names, languages (`es`/`en`), regions (`MX`, `AR`, `CO`, `CL`, `ES`), `consultation_rate_usdt`, `available = true`, contact info
- [ ] T076 [P] [US5] Create Pydantic models for `ConsultationBooking`, `ProfessionalDecisionTree` in `agent/models/types.py`
- [ ] T077 [US5] Implement decision tree logic in `agent/services/booking_agent.py`: function `evaluate_decision_tree(user_id) -> ProfessionalDecisionTree`. Checks: (1) has registered professional on profile? → path `own_professional`. (2) has previously known professional? → path `own_professional`. (3) has insurance flag? → path `insurance_network`. (4) else → queries `mental_health_professionals` table for available match on language + region → path `breso_network`.
- [ ] T078 [US5] Implement `GET /bookings/decision-tree` in `agent/routers/bookings.py`: calls `booking_agent.evaluate_decision_tree()`; checks Premium gate (`subscription_service.check_feature_gate()`); returns the decision tree result
- [ ] T079 [US5] Implement autonomous booking in `agent/services/booking_agent.py`: function `execute_breso_network_booking(user_id, professional_id, alert_id)`. Inserts `ConsultationBooking` row with status `initiated`; calls Thirdweb x402 SDK to send USDT from BRESO agent wallet to professional wallet; polls for confirmation (max 10 attempts, 15s apart); updates booking status to `confirmed` or `failed`; sends email notification to user and trusted contact.
- [ ] T080 [US5] Hook autonomous booking into `agent/services/alert_dispatcher.py`: when Level 2+ alert dispatched for a Premium user, call `evaluate_decision_tree()` and if path is `breso_network`, schedule `execute_breso_network_booking()` asynchronously
- [ ] T081 [US5] Implement `GET /bookings/{booking_id}` in `agent/routers/bookings.py`: returns booking status from Supabase
- [ ] T082 [US5] Implement booking failure handling in `agent/services/booking_agent.py`: on payment failure or no availability, update booking to `failed`, set `failure_reason`, send `booking_failure` notification to trusted contact (per `notification-schema.yaml`) with alternative resource links
- [ ] T083 [P] [US5] Create `frontend/src/pages/Bookings.tsx`: decision tree UI. Step-by-step form walking through the 4 decision points. Shows recommended path and professional details. For `breso_network` path: shows payment widget (Thirdweb x402). Displays booking confirmation with professional name, consultation date/time, and payment tx hash link to Celo explorer.
- [ ] T084 [US5] Populate `frontend/src/i18n/es.json` and `en.json` with all professional coordination and booking UI strings

**Checkpoint**: A Premium user can walk the full decision tree, reach the BRESO network path, trigger autonomous payment, and receive booking confirmation via the frontend and email. Payment appears on Celo Alfajores.

---

## Phase 9: User Story 6 — On-Chain Identity, Consent, and ZK Verification (Priority: P6)

**Goal**: BRESO's ERC-8004 agent identity is deployed and visible on AgentScan. Consent records are immutable on-chain. Trusted contacts complete ZK identity verification via Self Protocol before being activated.

**Independent Test**: (1) Query 8004scan.io for BRESO's token ID — agent identity visible. (2) Add a trusted contact → contact receives ZK verification link → completes flow → contact dashboard activates. (3) Update alert threshold → consent tx appears on Celo Alfajores within 60s.

- [ ] T085 [US6] Write `contracts/BRESOAgentRegistry.sol`: minimal ERC-721 with ERC-8004 extension. Constructor mints one NFT to deployer wallet. `register(name, version, metadataURI)` stores agent metadata. Emits `AgentRegistered(tokenId, agentAddress, name, version)`.
- [ ] T086 [US6] Write `contracts/ConsentRegistry.sol`: stateless event emitter only. Function `recordConsent(userIdHash, payloadHash, threshold, contactWallet)` emits `ConsentUpdated(userIdHash, actionType, payloadHash, threshold, contactWallet, timestamp)`. No on-chain state (events are the record).
- [ ] T087 [US6] Write `contracts/MockUSDT.sol` (if not already done in T060): standard OpenZeppelin ERC20, 6 decimals, `mint(address, amount)` public for testnet. (Skip if T060 already created this.)
- [ ] T088 [US6] Write deploy script `contracts/scripts/deploy.ts`: deploys `BRESOAgentRegistry`, `ConsentRegistry`, `MockUSDT` to Celo Alfajores; logs all contract addresses; writes addresses to `contracts/deployed.json`.
- [ ] T089 [US6] Write `contracts/scripts/register-agent.ts`: reads `BRESOAgentRegistry` address from `deployed.json`; calls `register("BRESO", "1.0.0", "data:application/json;base64,{base64_metadata}")` from deployer wallet; logs the NFT `tokenId`. The metadata JSON includes agent name, description, wallet, and AgentScan link.
- [ ] T090 [US6] Run deployment: `npx hardhat run scripts/deploy.ts --network alfajores` → `npx hardhat run scripts/register-agent.ts --network alfajores`. Record contract addresses and token ID in `agent/.env`. Verify on 8004scan.io.
- [ ] T091 [US6] Hook consent events into `agent/routers/contacts.py`: on `POST /contacts` (create) and `PATCH /contacts/threshold` (update), call `celo_client.send_consent_event()` after Supabase write. Log `consent.on_chain` event with `tx_hash`.
- [ ] T092 [US6] Implement Self Protocol ZK verification in `agent/integrations/self_protocol.py`: function `generate_verification_request(contact_id) -> {verification_url, qr_code}` — calls Self Protocol SDK with scope `age_verification` and callback `POST /contacts/zk-callback`. Function `verify_callback_signature(payload, signature) -> bool` — validates Self Protocol HMAC on incoming callback.
- [ ] T093 [US6] Implement `POST /contacts` in `agent/routers/contacts.py`: inserts `TrustedContact` row with `zk_verified = false`, `active = false`; calls `self_protocol.generate_verification_request()`; sends verification URL to contact's email; returns `ContactStatus` with `zk_verification_url`.
- [ ] T094 [US6] Implement `POST /contacts/zk-callback` in `agent/routers/contacts.py` (public route): validates Self Protocol signature; if `proof_valid = true` and `age_verified = true`, updates `trusted_contacts` row: `zk_verified = true`, `active = true`, `zk_age_range_confirmed = true`, stores nullifier for replay prevention. Returns 200.
- [ ] T095 [US6] Implement `GET /contacts` and `PATCH /contacts/threshold` in `agent/routers/contacts.py`: GET returns contact status; PATCH updates alert threshold and calls `celo_client.send_consent_event()`.
- [ ] T096 [US6] Implement `GET /agent/identity` in `agent/routers/` (new router `agent_identity.py`, public): returns `AgentIdentityInfo` from env vars + `agent_identity` table; includes `agentscan_url = f"https://8004scan.io/agent/{token_id}"`.
- [ ] T097 [P] [US6] Create `frontend/src/pages/ContactSetup.tsx`: contact configuration form. Email, relationship label, alert threshold selector. On submit: calls `POST /contacts`; shows QR code (from `zk_verification_url`) with instructions for contact to scan with Self app. Shows pending/verified status with polling on `GET /contacts`.
- [ ] T098 [P] [US6] Create `frontend/src/pages/AgentProfile.tsx`: BRESO's on-chain identity page. Displays agent name, version, contract address, NFT token ID, registration date, wallet address. Prominent link to AgentScan opens 8004scan.io/agent/{tokenId}. Shows last 5 transactions (recent alerts + payments) pulled from `GET /alerts` and `GET /subscriptions/status`.
- [ ] T099 [US6] Populate `frontend/src/i18n/es.json` and `en.json` with contact setup, ZK verification, and agent identity UI strings

**Checkpoint**: BRESO's agent identity is visible on 8004scan.io. Adding a trusted contact triggers the ZK verification flow and activates the contact after successful proof. Consent threshold changes produce on-chain transactions within 60s.

---

## Phase 10: Premium Features and Polish (Cross-Cutting)

**Purpose**: Implement remaining Premium-exclusive features and end-to-end validation.

- [ ] T100 [P] Implement weekly pattern analysis in `agent/services/pattern_analyzer.py`: function `generate_weekly_summary(user_id) -> str` — queries last 7 days of check-in metrics; calls Claude to produce a 2–3 sentence bilingual reflection (e.g., "Te sientes mejor los martes y más bajo los domingos — ¿quieres explorar por qué?"). Stored in `subscriptions` table as `last_weekly_summary`. Scheduled weekly for Premium users.
- [ ] T101 [P] Implement Goals CRUD in `agent/routers/` (new file `goals.py`): `POST /goals`, `GET /goals`, `PATCH /goals/{id}` — Premium gated. Goals are referenced in check-in prompt context for follow-up.
- [ ] T102 [P] Implement Wellness Report generation in `agent/services/personalization.py`: function `generate_monthly_report(user_id) -> bytes` — builds a PDF-like markdown summary of 30-day tone trend, top emotions, personalization profile highlights. Uploads to Supabase Storage under `reports/{user_id}/{date}.md`. Returns download URL (signed, expires 90 days, private to user). Premium gated.
- [ ] T103 [P] Implement Anonymous Therapist Summary in `agent/services/personalization.py`: function `generate_therapist_summary(user_id) -> bytes` — anonymized version of monthly report; strips all identifying info; adds prominent disclaimer "NOT a clinical document." Uploaded to Supabase Storage, private signed URL returned. Premium gated.
- [ ] T104 [P] Implement "Tough Week Mode" detection in `agent/services/pattern_analyzer.py`: function `check_tough_week_mode(user_id)` — activates if 5+ consecutive check-ins below baseline by > 1σ AND user is Premium. Sets `users.tough_week_active = true`. Check-in scheduler delivers 2 check-ins per day in Tough Week Mode. Deactivates when 3 consecutive check-ins normalize.
- [ ] T105 [P] Implement "Start Over" mode endpoint `POST /checkins/start-over` (Premium gated): resets `behavioral_baselines` soft-state (marks as `restarted_at`, keeps history for audit) and sends a special "no judgment, fresh start" check-in message.
- [ ] T106 Add `GET /subscriptions/status` check to all Premium-gated endpoints: return `HTTP 403 {"code": "premium_required", "message": "..."}` in English and Spanish based on user language preference
- [ ] T107 [P] Create `frontend/src/pages/PremiumFeatures.tsx`: Premium-only tab in Dashboard showing weekly summary card, goals tracker, and links to generate wellness report and therapist summary. Gated with upgrade prompt for Essential users.
- [ ] T108 Run the 8-step demo flow from `quickstart.md` end-to-end: verify all steps complete without errors; update `quickstart.md` with any corrections found
- [ ] T109 [P] Structured log audit: verify every LLM call produces a log with all required fields (`model_id`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `outcome`); verify every `payment.confirmed`, `alert.sent`, `consent.on_chain` event is logged at INFO level
- [ ] T110 [P] RLS audit: use Supabase table editor to attempt cross-user queries as authenticated users; document results in `checklists/requirements.md` SC-016 row
- [ ] T111 [P] Update `CLAUDE.md` via `update-agent-context.ps1` with final tech stack (add Supabase, remove SQLite reference)

**Final Checkpoint**: All 8 demo steps from `quickstart.md` complete end-to-end. AgentScan shows BRESO's identity and transactions. Subscription payment visible on Celo Alfajores. Contact dashboard receives real-time alert. ZK verification activates a trusted contact.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **Phase 3 (US0 — Auth)**: Depends on Phase 2 — first user story; gates all others
- **Phase 4 (US1 — Check-In)**: Depends on Phase 3 (needs authenticated users)
- **Phase 5 (US2 — Personalization)**: Depends on Phase 4 (needs check-in data pipeline)
- **Phase 6 (US3 — Subscription)**: Depends on Phase 3 — can start parallel to US1
- **Phase 7 (US4 — Alerts)**: Depends on Phase 4 (needs baseline) + Phase 3 (needs contacts)
- **Phase 8 (US5 — Coordination)**: Depends on Phase 7 (triggered by alerts) + Phase 6 (Premium gate)
- **Phase 9 (US6 — On-Chain)**: Depends on Phase 2 — can start parallel to US0 for contract deployment
- **Phase 10 (Polish)**: Depends on all stories complete

### User Story Dependencies

| Story | Can Start After | Notes |
|-------|----------------|-------|
| US0 (Auth) | Phase 2 | Required before all others |
| US1 (Check-In) | US0 | Core data pipeline |
| US2 (Personalization) | US1 | Needs check-in pipeline to extract data |
| US3 (Subscription) | US0 | Can start parallel to US1 |
| US4 (Alerts) | US1 + contacts from US6 | Needs baseline data |
| US5 (Coordination) | US4 + US3 | Premium gate + alert trigger |
| US6 (On-Chain) | Phase 2 for contracts | ZK callback needs contacts API |

### Parallel Opportunities Within Phases

**Phase 2 (Foundational)**: T014, T015, T016, T017, T018 all parallelizable
**Phase 4 (US1)**: T032, T033, T040, T041 all parallelizable
**Phase 5 (US2)**: T043, T050 parallelizable with T044–T049
**Phase 6 (US3)**: T052, T053, T058, T059 all parallelizable
**Phase 7 (US4)**: T062, T063, T071, T072 all parallelizable
**Phase 9 (US6)**: T085–T089 (contract writing) all parallelizable; T097, T098 parallelizable

---

## Parallel Execution Examples

### Fastest path to MVP (US0 + US1 working):

```
Stream A: T001 → T009 → T010 → T011 → T012 → T013 → T020 → T021 → T022 → T023 → [US0 tasks]
Stream B: T002 → T014 → T015 (prompts) — join after T012
Stream C: T003 → T004 → T017 → T018 → T019 (frontend foundation) — join for US0 frontend
```

### Parallel contract work (can run during US0/US1):

```
Stream D (contracts): T085 → T086 → T087 → T088 → T089 → T090 (deploy)
  → then T091 (consent events) joins main backend stream
```

---

## Implementation Strategy

### MVP Scope (Demo Steps 1–3 from quickstart.md)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US0 — Auth (gates all other features)
4. Complete Phase 4: US1 — Daily Check-In
5. **STOP and VALIDATE**: User can register, sign in, receive bilingual check-in, respond, see anonymized metrics on dashboard, see baseline forming after 7 check-ins
6. Demo Steps 1–3 complete ✓

### Full Hackathon Demo (All 8 Steps)

1. MVP Scope (Steps 1–3)
2. Phase 5: US2 — Personalization (Step 3 enhancement)
3. Phase 9: US6 — On-Chain contracts (Step 7, 8 — can run in parallel during US1)
4. Phase 6: US3 — Subscription (Step 6)
5. Phase 7: US4 — Alerts + Real-time Dashboard (Step 4)
6. Phase 8: US5 — Professional Coordination (Step 5)
7. Phase 10: Polish (Step validation, observability audit)

---

## Notes

- `[P]` tasks = different files, no blocking dependency — can run in parallel
- `[USN]` label maps task to user story for traceability
- Each user story has an **Independent Test** criterion — stop and validate before moving to the next story
- Supabase RLS is the primary data isolation mechanism (FR-037, SC-016); validate it explicitly in T031 and T110
- All LLM calls must log: `model_id`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `outcome` (Constitution Principle II)
- Crisis line numbers (T073) must load in < 5 seconds with NO LLM dependency (SC-012) — hardcoded only
- Commit after each task or logical group
- Contract deployment (T090) requires funded wallet — do this early to unblock ZK and consent flow testing
