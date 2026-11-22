# Implementation Tasks — KhataAI (Advanced Edition)

Use `[ ]` todo, `[/]` in progress, `[x]` complete. Do not mark complete without implementation and verification.

## Phase 0 — Repository discovery
- [x] Inspect repository, framework, scripts, existing components and backend.
- [x] Read all project guidance files (PRD, ARCHITECTURE, DESIGN, RULES, TASKS, PROGRESS, ANTIGRAVITY_PROMPT).
- [x] Record current state and risks in PROGRESS.md.
- [x] Confirm Gnani credentials, service access, supported languages, quotas and API contract.
- [x] Confirm deployment target and Supabase project availability.

## Phase 1 — App foundation
- [x] Configure TypeScript strict mode, lint, formatting and tests.
- [x] Build responsive website shell and navigation for desktop, tablet and mobile.
- [x] Set Hindi/Hinglish as first-run default; add natural localized copy for core voice flows.
- [x] Add PWA manifest, service worker, installability and offline app shell.
- [x] Add language selector and first-turn AI disclosure.
- [x] Add `.env.example` and verify `.env` is ignored.
- [x] Fix sidebar to be stationary and independent from scrolling content.
- [x] Remove top demo mode banner for clean production look.

## Phase 2 — Ledger core (highest priority)
- [x] Define money utility using integer paise (zero floats).
- [x] Implement deterministic credit/payment service.
- [x] Implement customer CRUD and normalized name matching.
- [x] Implement duplicate-name resolver ("Ramesh Sharma ya Ramesh Gupta?").
- [x] Implement append-only correction/reversal model.
- [x] Implement idempotency handling.
- [x] Implement customer balance and daily aggregates.
- [x] Add unit tests for all ledger operations (15 passing tests).

## Phase 3 — Voice UX and provider adapters
- [x] Implement push-to-talk control and microphone permission handling.
- [x] Implement audio capture, cancellation and state machine (10 states).
- [x] Define SpeechProvider interface (`SpeechProvider.ts`).
- [x] Implement MockSpeechProvider with 8 scripted judging scenarios.
- [x] Implement WebSpeechProvider for browser native live microphone streaming.
- [x] Verify official Gnani STT API contract and proxy gateway (`server/voiceGateway.ts`).
- [x] Implement Gnani STT streaming adapter (`GnaniSpeechProvider.ts`).
- [x] Implement Gnani TTS adapter (`GnaniSpeechProvider.ts`).
- [x] Add provider timeout (10s), exponential backoff retry, rate-limit and error handling.
- [x] Add unit tests for all speech providers (7 passing tests, total 33 tests).

## Phase 4 — Parsing and conversation state
- [x] Implement Hindi/English number parser (`numberParser.ts`).
- [x] Support numeric, Hindi number words and English number phrases.
- [x] Parse credit/payment direction.
- [x] Parse “kal” and “parso” with Asia/Kolkata.
- [x] Implement strict intent schema and Gemini 3.5 Flash Lite live integration.
- [x] Implement confidence thresholds and clarification.
- [x] Implement pending draft correction (“nahi, 430”).
- [x] Ensure transcript cannot trigger arbitrary tool actions.
- [x] Add parser and conversation-state tests (11 passing tests).

## Phase 5 — UI surfaces & Auth
- [x] Build voice-first home screen with 10 explicit states.
- [x] Build live streaming transcript and intent preview.
- [x] Build spoken clarification UI for duplicate customers.
- [x] Build customer list/search with balances.
- [x] Build customer detail and running ledger history.
- [x] Build transaction history with multi-criteria filters.
- [x] Build daily summary dashboard.
- [x] Implement authentic Supabase Auth login/signup + pre-loaded test account (`sharma.kirana@demo.in`).
- [x] Guarantee clean empty slate (0 customers, 0 transactions) for new merchant registrations.

## Phase 6 — Advanced Feature Enhancements
- [/] Task 6.1: Context-aware voice conversations with short-lived session memory (90-sec TTL, pronoun/anaphora resolution).
- [ ] Task 6.2: Personalized shop-specific customer aliases (alias schema, resolver matching, UI badges).
- [ ] Task 6.3: Voice-based customer creation (unknown customer detection, confirmation prompt, atomic ledger execution).
- [ ] Task 6.4: Daily closing reports with credit, payments, and outstanding summaries (modal, TTS spoken overview, export).
- [ ] Task 6.5: AI-powered business analytics using deterministic database queries (aging buckets, recovery rates, 100% deterministic math).
- [ ] Task 6.6: PDF transaction receipt generation (custom 80mm slip, customer ledger PDF export).
- [ ] Task 6.7: Transaction undo through auditable reversal entries (instant undo toast, `REVERSAL` transaction creation, audit events).
- [ ] Task 6.8: Voice-based inventory management as an optional module (Settings toggle, item schema, voice stock check/update).

## Phase 7 — Verification & Documentation
- [ ] Verify Vitest test suite passes with new feature coverage.
- [ ] Verify Vite production build with zero TypeScript errors.
- [ ] Test end-to-end user flows in browser.
- [ ] Update PROGRESS.md with completion timestamps and metrics.
