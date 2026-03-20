# Feature Specification: BRESO — Bilingual AI Mental Wellness Companion

**Feature Branch**: `001-breso-depression-agent`
**Created**: 2026-03-20
**Updated**: 2026-03-20 (v3 — auth model, real-time contact dashboard, report storage, data isolation)
**Status**: Draft (updated)
**Input**: Refined description — bilingual companion, subscription model, personalization engine, 3-level alert system, cloud-hosted data layer with auth, realtime notifications, and user data isolation

## User Scenarios & Testing *(mandatory)*

### User Story 0 — Account Access: Registration and Sign-In (Priority: P0)

A new user visits BRESO, enters their email address, and either sets a password or requests a magic link sent to their inbox. Within seconds they are signed in. Returning users can sign in the same way. The user's identity is verified without exposing personal data beyond their email. Once inside, all their data — check-ins, alerts, profile, reports — belongs exclusively to them and is never accessible to other users.

**Why this priority**: Authentication gates every other feature. Without a verified session, no check-in, no alert, and no payment can be securely attributed to the right person. Magic link removes the friction of password management for a wellness context where low friction matters.

**Independent Test**: Can be fully tested by registering with a new email, receiving and clicking a magic link, and verifying that the session is established and the user can access their (empty) dashboard — no data from any other user is visible.

**Acceptance Scenarios**:

1. **Given** a new user enters their email, **When** they choose "Send magic link", **Then** a single-use sign-in link is delivered to their inbox within 60 seconds and expires after 15 minutes.
2. **Given** a new user enters their email and password, **When** they submit the registration form, **Then** their account is created and they are signed in immediately with language selection prompted.
3. **Given** a returning user enters their email and password, **When** they sign in, **Then** their existing check-in history, personalization profile, and subscription status are available immediately.
4. **Given** a user is signed in, **When** they navigate the app, **Then** they can only see their own data — no data from any other registered user is visible or accessible at any point.
5. **Given** a signed-in user is inactive for 7 days, **When** they return to the app, **Then** they are prompted to re-authenticate before accessing any personal data.

---

### User Story 1 — Daily Conversational Check-In with Personalized Support (Priority: P1)

A registered user opens the BRESO web interface and receives a short, warm, conversational message from the agent — in their preferred language (Spanish or English). The agent reads the room: if the user seems low energy, it listens; if they seem receptive, it proposes a personalized activity. The user replies naturally, as they would to a trusted friend. Over time, BRESO adapts completely to each person — their interests, routines, energy levels, and what brings them joy. BRESO never diagnoses. It always refers to professional help when in doubt.

**Why this priority**: This is the core value loop. Every other feature builds on the data and relationship established here. It delivers immediate value from day one as a warm, non-judgmental daily touchpoint.

**Independent Test**: Can be fully tested by registering a user, completing 3 consecutive check-ins, and verifying that: (a) messages are delivered in the user's language, (b) the conversation mode adapts across check-ins, and (c) anonymized behavioral metrics accumulate without raw content being stored.

**Acceptance Scenarios**:

1. **Given** a registered user opens the app, **When** the agent sends the daily check-in, **Then** the message is conversational, under 50 words, in the user's selected language (Spanish or English), and uses one of the 5 conversation modes appropriate to the context.
2. **Given** a user submits a check-in response, **When** the agent processes it, **Then** response delay, message length, and emotional tone score are recorded — raw message content is never stored.
3. **Given** a user has not responded within 24 hours, **When** the check-in window lapses, **Then** the non-response is recorded as a data point and BRESO gently follows up the next day without judgment.
4. **Given** a user has completed at least 7 check-ins, **When** the agent evaluates patterns, **Then** a behavioral baseline exists across tone, response time, and engagement dimensions.
5. **Given** a user's personalization profile contains interests or hobbies, **When** the agent selects a conversation mode of "Propose", **Then** the suggested activity is directly tied to that user's specific profile — not a generic suggestion.
6. **Given** BRESO enters "Silent Alert" mode (Level 1 internal flag), **When** the user receives their next check-in, **Then** the tone and frequency of messages increases subtly — the user is not alarmed.

---

### User Story 2 — Personalization Engine: BRESO Gets to Know You (Priority: P2)

From the very first conversation, BRESO builds a behavioral profile about the user — their interests, daily routines, energy patterns, hobbies, social preferences, and what brings them joy or drains their energy. This profile evolves continuously. After two weeks, BRESO knows that this user is more energetic on Tuesday mornings, loves running and indie music, and struggles on Sunday evenings. Check-ins, activity proposals, and motivational content all adapt to this profile.

**Why this priority**: Personalization is BRESO's key differentiator. Generic wellness apps give generic suggestions. BRESO gives suggestions that feel like they come from someone who actually knows you. This drives engagement and retention.

**Independent Test**: Can be tested by completing 5 check-ins mentioning different interests/topics, then querying the personalization profile to verify that interests, hobbies, and energy patterns were correctly extracted and that subsequent check-in messages reflect them.

**Acceptance Scenarios**:

1. **Given** a user mentions an interest (e.g., "I went running this morning") in a check-in, **When** the agent processes the response, **Then** "running" is added to the user's interest/hobby profile.
2. **Given** a user's profile shows higher energy in the morning, **When** the agent schedules a proactive message, **Then** the message is sent at the user's optimal time — not a fixed default.
3. **Given** a user's profile contains specific interests, **When** BRESO enters "Propose" mode, **Then** the proposed activity is directly tied to those interests (e.g., "You mentioned you love music — here's a 15-minute playlist for your afternoon").
4. **Given** 4 weeks of check-ins with consistent patterns, **When** the Premium user reviews their weekly analysis, **Then** the summary includes accurate pattern observations (e.g., "You tend to feel lower on Sunday evenings — want to explore this together?").

---

### User Story 3 — Tiered Subscription: Essential and Premium Plans (Priority: P3)

BRESO offers two subscription tiers paid in USDT stablecoins on the Celo blockchain. Essential ($5/month) gives users one daily check-in and core wellness tools. Premium ($12/month) unlocks unlimited check-ins, two trusted contacts, full crisis protocol, professional coordination, weekly pattern insights, and advanced support features. Both tiers include crisis line numbers regardless of subscription level.

**Why this priority**: Subscriptions are the business model. The payment flow demonstrates the Celo/x402 integration. Feature gating between tiers drives Premium conversions.

**Independent Test**: Can be tested by subscribing to Essential, verifying the feature set is correctly gated, then upgrading to Premium and verifying the additional features unlock immediately.

**Acceptance Scenarios**:

1. **Given** a new user has no active subscription, **When** they attempt to use any check-in feature, **Then** they are prompted to choose a subscription plan.
2. **Given** a user selects the Essential plan, **When** payment is confirmed on-chain, **Then** the subscription activates immediately and the user has access to exactly the Essential feature set.
3. **Given** an Essential subscriber attempts to add a second trusted contact, **When** the request is submitted, **Then** the system blocks the action and explains that Premium is required.
4. **Given** a Premium subscriber, **When** they access weekly pattern analysis, **Then** the system displays a personalized summary of their emotional patterns from the past week.
5. **Given** a Level 3 (Red) crisis alert is triggered, **When** the system evaluates the user's subscription, **Then** crisis line numbers are displayed and the trusted contact is notified regardless of subscription tier.
6. **Given** a subscription expires, **When** the user opens the app, **Then** they are notified of expiration and their data is preserved for 30 days while they renew.

---

### User Story 4 — Three-Level Alert System and Crisis Protocol (Priority: P4)

BRESO uses a three-level alert system. Level 1 (Yellow) is invisible to the user — BRESO simply increases its support frequency. Level 2 (Orange) sends the trusted contact a warm, non-alarmist message. Level 3 (Red) activates the full crisis protocol: country-specific crisis numbers are shown, the trusted contact is urgently notified, and the registered professional (if any) is informed. BRESO never diagnoses. At every level, it recommends professional support.

**Why this priority**: The alert system is the core safety outcome of BRESO. It depends on P1 (check-in data) and P3 (subscription — two contacts require Premium).

**Independent Test**: Can be tested end-to-end by submitting deteriorating check-in responses over simulated days, verifying each alert level activates at the correct threshold, and confirming that Level 3 always shows crisis numbers regardless of subscription.

**Acceptance Scenarios**:

1. **Given** a user's behavioral metrics show mild deviation (3–4 consecutive days below baseline), **When** the Level 1 threshold is crossed, **Then** BRESO increases internal check-in frequency with no external notification — the user notices more frequent, warmer messages.
2. **Given** sustained mild signals (5–7 days) or a sudden moderate drop, **When** Level 2 is triggered, **Then** the trusted contact receives a bilingual, non-alarmist message (e.g., "Your [relationship] may need a little extra support this week") within 60 seconds.
3. **Given** a Level 3 trigger (high-risk language, 48h no-response, or extreme deviation), **When** the crisis protocol activates, **Then** the user's interface immediately shows the country-appropriate crisis helpline number AND the trusted contact receives an urgent notification.
4. **Given** a Level 3 trigger with a registered professional, **When** the crisis protocol activates, **Then** the professional is also notified within 60 seconds.
5. **Given** any alert level is active, **When** the alert message is delivered, **Then** no diagnostic language, health data, or raw behavioral metrics are included — only a supportive welfare notice.
6. **Given** a user configured alert preferences with "moderate" threshold, **When** patterns cross the "mild" threshold only, **Then** no external notification is sent (only internal Level 1 response).
7. **Given** a trusted contact has access to their contact dashboard, **When** a Level 2 or Level 3 alert is triggered, **Then** the alert appears on the trusted contact's dashboard in real time — without the contact needing to refresh the page — alongside the date, time, and a non-alarmist description.

---

### User Story 5 — Professional Coordination Decision Tree (Priority: P5)

When conditions warrant professional support (Premium subscribers), BRESO walks through a structured decision tree: Does the user already have a therapist? Have they worked with someone before and want to reconnect? Do they have health insurance coverage? If none of these, BRESO surfaces accessible and low-cost options from its own network. Payment for the first consultation is processed autonomously in USDT.

**Why this priority**: This closes the care loop — from detection to professional support. Premium-only feature. Depends on P4 (alert trigger or user request).

**Independent Test**: Can be tested by simulating a Premium user with no registered professional, walking through the full decision tree, and verifying that the BRESO network path initiates an autonomous USDT payment and sends booking confirmations.

**Acceptance Scenarios**:

1. **Given** a Premium user is prompted for professional coordination, **When** they indicate they have a registered professional, **Then** BRESO offers to remind them about their next appointment or send an urgent message to the professional.
2. **Given** a user has no registered professional but mentions a previous therapist, **When** they choose to reconnect, **Then** BRESO guides them through adding that professional to their profile.
3. **Given** a user has health insurance, **When** the coordination flow reaches this step, **Then** BRESO displays the coverage network options for mental health services.
4. **Given** a user has no professional and no insurance, **When** the BRESO network path is selected, **Then** an available professional matching the user's language and region is selected, payment is initiated autonomously, and both user and trusted contact are notified of the booking.
5. **Given** autonomous booking fails (no availability or payment failure), **When** the system exhausts its attempts, **Then** the trusted contact is notified that manual action is needed and low-cost resource links are provided.

---

### User Story 6 — On-Chain Identity, Consent, and Transparency (Priority: P6)

BRESO is registered as a verifiable on-chain agent. Every consent change, alert event, and payment is visible on AgentScan (8004scan.io). Trusted contacts complete zero-knowledge identity verification — BRESO only receives a "verified/not verified" signal, never any personal document data. Users own their consent preferences, which are stored immutably on-chain.

**Why this priority**: Trust and regulatory transparency are prerequisites for a health-adjacent product in Latin America. ZK verification and on-chain records protect user privacy while enabling accountability.

**Independent Test**: Can be tested by querying AgentScan for BRESO's agent identity, completing a ZK verification flow and confirming no personal data is stored, and verifying that a consent update produces an immutable on-chain record.

**Acceptance Scenarios**:

1. **Given** BRESO is deployed, **When** a user or auditor queries AgentScan, **Then** BRESO's agent identity, registration date, and activity log are publicly visible.
2. **Given** a trusted contact completes ZK verification, **When** the verification is processed, **Then** BRESO receives only a boolean result (verified/not verified) and an adult-age confirmation — no document data, name, or ID number is stored.
3. **Given** a user updates their consent preferences, **When** the update is saved, **Then** an immutable record is written on-chain and the user can retrieve it at any time without technical knowledge.
4. **Given** a contact fails ZK verification, **When** the user attempts to activate them, **Then** the contact cannot receive alerts until verification succeeds.

---

### Edge Cases

- What happens when a user code-switches between Spanish and English mid-conversation?
- How does the system handle account deletion while a Level 2 alert is pending delivery?
- What if the trusted contact's ZK verification expires after being activated?
- What if the Celo network is congested and a payment confirmation takes more than 5 minutes?
- How does BRESO respond to a user who deliberately gives extreme responses to manipulate the alert system?
- What if no professionals are available in the user's language or region in the BRESO network?
- What happens to Premium features when a subscription lapses — are they immediately cut off or grace-period granted?
- What if a user requests crisis support but is in a country not in the hardcoded crisis number list?
- How does "Tough Week Mode" end — does the user deactivate it, or does it auto-resolve based on improved patterns?
- What happens if the magic link is used from a different device than where it was requested?
- What if a trusted contact's dashboard is open when a Level 3 alert fires — does the real-time notification play an alert sound?
- What if a Premium user generates a wellness report but never downloads it — how long is it retained?
- Can a user sign in with both password and magic link on the same account, or must they choose one method at registration?

## Requirements *(mandatory)*

### Functional Requirements

**Core Check-In & Personalization**

- **FR-001**: The system MUST send at least one conversational check-in message per day to the user via the web interface, in their selected language (Spanish or English).
- **FR-002**: Essential subscribers receive exactly one daily check-in; Premium subscribers may initiate additional check-ins at any time.
- **FR-003**: The system MUST adapt each check-in using one of five conversation modes: Listen, Motivate, Propose, Celebrate, or Silent Alert — selected based on the user's recent behavioral patterns.
- **FR-004**: The system MUST record each check-in interaction with: timestamp, response delay, message length, and an AI-derived emotional tone score — raw message text MUST NOT be persisted.
- **FR-005**: The system MUST build and maintain a personalization profile for each user from their check-in responses, capturing: interests, hobbies, energy patterns by time of day, social preferences, joy triggers, and energy drains.
- **FR-006**: The system MUST build a behavioral baseline after a minimum of 7 check-ins, tracking average and deviation for tone, response time, and engagement frequency.
- **FR-007**: Activity proposals MUST be generated from the user's personalization profile — not from generic templates. Essential subscribers receive 3 proposals per week; Premium subscribers receive daily proposals.

**Alert System**

- **FR-008**: The system MUST detect Level 1 (Yellow) signals — mild, sustained deviations over 3–4 consecutive check-ins — and respond by increasing internal support frequency with no external notification.
- **FR-009**: The system MUST detect Level 2 (Orange) signals — sustained mild signals for 5–7 days or a sudden moderate deviation — and automatically send the trusted contact a non-alarmist bilingual welfare message within 60 seconds.
- **FR-010**: The system MUST detect Level 3 (Red) signals — high-risk language, 48-hour non-response, or extreme deviation — and immediately display the country-appropriate crisis helpline number to the user AND send an urgent notification to the trusted contact.
- **FR-011**: Level 3 crisis helpline numbers MUST be shown to ALL users regardless of subscription tier. Minimum required: AR:135, MX:800-290-0024, CO:106, CL:600-360-7577, ES:024, USA:988.
- **FR-012**: The system MUST NEVER include diagnostic language, raw behavioral data, or health assessments in any alert message — only supportive welfare notices.
- **FR-013**: The system MUST NEVER make a diagnosis. At any level of concern, BRESO MUST recommend professional help.
- **FR-014**: If a registered professional is configured and a Level 3 alert triggers, the professional MUST also be notified within 60 seconds.

**Trusted Contacts & Consent**

- **FR-015**: Essential subscribers may configure one trusted contact; Premium subscribers may configure up to two trusted contacts.
- **FR-016**: Every trusted contact MUST complete zero-knowledge identity verification before being activated. BRESO MUST store only the boolean verification result and a nullifier — no document data.
- **FR-017**: User consent preferences (contacts, alert thresholds) MUST be stored immutably on the Celo Alfajores testnet. Each change creates a new on-chain record; previous records are preserved as history.
- **FR-018**: Users MUST be able to update or revoke trusted contacts and alert thresholds at any time; changes take effect immediately on-chain.

**Subscription & Payments**

- **FR-019**: The system MUST offer two subscription plans: Essential at $5 USDT/month and Premium at $12 USDT/month.
- **FR-020**: Subscription payments MUST be processed autonomously in USDT on Celo Alfajores testnet using the x402 payment protocol.
- **FR-021**: Premium features (unlimited check-ins, second contact, Level 3 protocol, professional coordination, weekly analysis, goals, reports, tough week mode) MUST be gated and inaccessible to Essential subscribers.
- **FR-022**: Level 3 crisis resources (crisis line numbers) MUST be accessible to all users regardless of subscription tier.

**Professional Coordination (Premium)**

- **FR-023**: When professional coordination is triggered, the system MUST walk through a decision tree: own registered professional → previously known professional → health insurance network → BRESO network → accessible low-cost options.
- **FR-024**: When the BRESO network path is selected, the system MUST autonomously select an available professional matching the user's language and region, process payment via x402, and notify both user and trusted contact of the booking.
- **FR-025**: If autonomous booking fails, the system MUST notify the trusted contact and provide alternative resource links.

**On-Chain Identity & Transparency**

- **FR-026**: BRESO MUST be registered as a verifiable on-chain agent using the ERC-8004 standard on Celo Alfajores testnet.
- **FR-027**: All agent-initiated transactions (consent updates, alert events, payments) MUST be visible and verifiable on AgentScan (8004scan.io).

**Premium-Exclusive Features**

- **FR-028**: Premium subscribers MUST receive a weekly pattern analysis summary highlighting emotional trends and prompting reflection.
- **FR-029**: Premium subscribers MUST be able to set personal goals that BRESO tracks and follows up on during check-ins.
- **FR-030**: Premium subscribers MUST be able to activate "Start Over" mode, which resets the emotional framing without judgment and restarts the support cycle.
- **FR-031**: Premium subscribers MUST receive a monthly wellness report summarizing their emotional evolution over the past month.
- **FR-032**: Premium subscribers MUST be able to generate an anonymous summary report that they can voluntarily share with their therapist — containing no personally identifiable information.
- **FR-033**: "Tough Week Mode" MUST automatically activate when Premium-level patterns indicate sustained distress, intensifying BRESO's support frequency and warmth.

**Authentication & Account Security**

- **FR-034**: The system MUST allow users to register and sign in via email and password.
- **FR-035**: The system MUST offer a passwordless magic link sign-in option — a single-use, time-limited link delivered to the user's email that signs them in without a password.
- **FR-036**: Magic links MUST expire within 15 minutes of generation and be invalidated after first use.
- **FR-037**: The system MUST enforce strict user-level data isolation — no authenticated user MUST ever be able to read, write, or infer any data belonging to another user. This applies to check-ins, alerts, personalization profiles, contacts, reports, and subscription records.
- **FR-038**: Inactive sessions MUST expire after 7 days of inactivity; users are prompted to re-authenticate before accessing personal data.

**Real-Time Contact Dashboard**

- **FR-039**: Trusted contacts MUST have access to a dedicated, authenticated dashboard where they can view alerts in real time — Level 2 and Level 3 alerts appear on the dashboard without requiring a page refresh or manual polling.
- **FR-040**: The real-time contact dashboard MUST display: alert level, date and time of trigger, and the same non-alarmist welfare message sent by email. No health data, behavioral metrics, or diagnostic language.

**Wellness Report Storage (Premium)**

- **FR-041**: Premium users MUST be able to download their monthly wellness report as a file from their account at any time within 90 days of generation.
- **FR-042**: The anonymous therapist summary report (FR-032) MUST be downloadable as a file that the user can share — it MUST contain no personally identifiable information and include a visible disclaimer that it is not a clinical document.
- **FR-043**: Stored report files MUST be accessible only to the user who generated them — no report file is publicly accessible or shareable via a guessable URL.

### Key Entities

- **User**: A registered individual using BRESO. Has a language preference (ES/EN), subscription tier, behavioral baseline, personalization profile, and one or two trusted contacts.
- **Check-In**: A daily interaction event. Stores anonymized metrics (tone score, response delay, word count, conversation mode) — never raw message content.
- **PersonalizationProfile**: An evolving record of the user's interests, routines, energy patterns, hobbies, and social preferences — built continuously from check-ins.
- **BehavioralBaseline**: Statistical norms (average + deviation) for tone, response time, and engagement frequency, derived from at least 7 check-ins.
- **Alert**: A tiered welfare event (Level 1/2/3). Contains only anonymized deviation data — no health data. On-chain record for Level 2+.
- **TrustedContact**: A ZK-verified individual (family or friend) pre-authorized to receive alerts. Up to 1 (Essential) or 2 (Premium).
- **ConsentRecord**: Immutable on-chain record of the user's contact and alert preferences. Append-only.
- **Subscription**: The user's active plan (Essential/Premium), payment status, and renewal date.
- **Goal**: A personal goal set by a Premium user, tracked across check-ins.
- **MentalHealthProfessional**: A directory entry with language, region, availability, and rate. Part of the BRESO network.
- **ConsultationBooking**: A confirmed appointment with on-chain payment receipt. Created autonomously by BRESO.
- **AgentIdentity**: BRESO's ERC-8004 on-chain identity NFT. Singleton per deployment.
- **UserSession**: An authenticated session tied to a registered user. Established via password or magic link. Expires after 7 days of inactivity.
- **TrustedContactDashboard**: A dedicated authenticated view accessible only to the trusted contact. Displays real-time alerts and welfare notices with no health data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users complete the daily check-in flow in under 3 minutes from opening the interface.
- **SC-002**: BRESO accurately detects a simulated behavioral deterioration pattern within 3 days of consistent check-ins showing threshold-crossing signals.
- **SC-003**: Level 2 and Level 3 alert messages are delivered to trusted contacts within 60 seconds of threshold detection.
- **SC-004**: Autonomous professional booking and payment confirmation completes within 90 seconds of trigger under normal network conditions.
- **SC-005**: Zero personally identifiable health data is exposed at any point in the check-in, alert, or booking flow — verifiable by audit of all stored records.
- **SC-006**: 100% of agent transactions appear on AgentScan within 60 seconds of on-chain confirmation.
- **SC-007**: Users complete onboarding (language selection, first check-in, contact setup) in under 10 minutes.
- **SC-008**: ZK contact verification completes in under 2 minutes.
- **SC-009**: At least 95% of scheduled daily check-ins are delivered within the user's configured daily time window.
- **SC-010**: Subscription payment confirmation and feature activation completes within 30 seconds of on-chain confirmation.
- **SC-011**: A user's personalization profile contains at least 3 identifiable interests after 5 completed check-ins.
- **SC-012**: Crisis line numbers (Level 3) are displayed within 5 seconds of trigger detection — no delays, no network dependency.
- **SC-013**: A magic link is delivered to the user's inbox within 60 seconds of request.
- **SC-014**: Real-time alert notifications appear on the trusted contact's dashboard within 5 seconds of alert trigger.
- **SC-015**: A generated wellness report is available for download within 30 seconds of generation request.
- **SC-016**: No user data from User A is accessible to User B under any authenticated session — verifiable by attempting cross-user data access and confirming rejection in 100% of cases.

## Assumptions

- Bilingual support means Spanish (es) and English (en); Portuguese is out of scope for MVP.
- Essential plan: 1 trusted contact, 1 daily check-in, 30-day history, activity proposals 3x/week.
- Premium plan: 2 trusted contacts, unlimited check-ins, full history, daily proposals, weekly analysis, goals, reports, tough week mode.
- Professional directory is a pre-populated static dataset for MVP; dynamic onboarding is out of scope.
- Celo Alfajores testnet is the deployment environment; mainnet and real-money payments are out of scope.
- Testnet USDT (mock ERC20 or cUSD) is used; no real funds are involved.
- ERC-8004 agent identity registration is a one-time deployment step, not per-user.
- Self Protocol ZK verification is available as an SDK integration; no custom ZK circuit is built.
- AgentScan indexes BRESO transactions automatically once the ERC-8004 agent identity is registered.
- "Tough Week Mode" auto-activates based on pattern signals and is deactivated when patterns normalize or user manually dismisses it.
- Crisis line numbers are hardcoded; a fallback to the IASP international directory is shown for unlisted countries.
- A user without an active subscription cannot access any BRESO feature except the subscription purchase flow and Level 3 crisis resources.
- Authentication supports both email/password and magic link; both methods are available to all users on the same account.
- A "magic link" is a secure, single-use, time-limited email link that signs the user in without a password — a standard passwordless authentication pattern.
- Trusted contacts have their own authenticated accounts (separate from the primary user) to access their contact dashboard.
- The trusted contact dashboard is read-only; contacts cannot modify user settings, alerts, or profiles.
- Wellness report files are retained for 90 days after generation; older reports must be regenerated on request.
- User-level data isolation is enforced at the data layer (not just the application layer) — a session belonging to User A cannot retrieve records belonging to User B under any circumstances.

## Out of Scope

- Portuguese language support (MVP is ES/EN only).
- More than two trusted contacts per user (Premium maximum is two).
- Mainnet deployment or real-money payments.
- Native mobile applications (iOS/Android).
- Clinician-facing dashboard or professional portal for managing patients.
- Dynamic professional onboarding or credentialing workflows.
- Follow-up booking management after the first consultation (one booking per alert cycle).
- Integration with electronic health record (EHR) systems.
- Formal clinical validation or regulatory approval (this is a demo/prototype).
- MercadoPago or credit card payments (future roadmap item, USDT/x402 only for MVP).
- In-app real-time chat outside the structured check-in flow.
