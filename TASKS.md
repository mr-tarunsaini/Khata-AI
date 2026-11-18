# Implementation Tasks — KhataAI

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
- [x] Add demo mode banner and synthetic seed data.

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
- [x] Verify official Gnani TTS API contract and proxy gateway.
- [x] Implement Gnani TTS adapter (`GnaniSpeechProvider.ts`).
- [x] Add provider timeout (10s), exponential backoff retry, rate-limit and error handling.
- [x] Add unit tests for all speech providers (7 passing tests, total 33 tests).

## Phase 4 — Parsing and conversation state
- [x] Implement Hindi/English number parser (`numberParser.ts`).
- [x] Support numeric, Hindi number words and English number phrases.
- [x] Parse credit/payment direction.
- [x] Parse “kal” and “parso” with Asia/Kolkata.
- [x] Implement strict intent schema and validation.
- [x] Implement confidence thresholds and clarification.
- [x] Implement pending draft correction (“nahi, 430”).
- [x] Ensure transcript cannot trigger arbitrary tool actions.
- [x] Add parser and conversation-state tests (11 passing tests).

## Phase 5 — UI surfaces
- [x] Build voice-first home screen with 10 explicit states.
- [x] Build live streaming transcript and intent preview.
- [x] Build spoken clarification UI for duplicate customers.
- [x] Build customer list/search with balances.
- [x] Build customer detail and running ledger history.
- [x] Build transaction history with multi-criteria filters.
- [x] Build daily summary dashboard.
- [x] Build settings, privacy and demo reset controls.

## Phase 6 — Persistence and security
- [x] Create Supabase schema/migrations (shops, profiles, customers, ledger_transactions, audit_events, pending_voice_sessions).
- [x] Configure Auth and shop membership.
- [x] Add and test RLS policies.
- [x] Move provider secrets to server environment.
- [x] Add transcript/audio retention controls.
- [x] Add export/delete flows (CSV export, demo reset).
- [x] Implement AES-GCM encrypted IndexedDB cache using Web Crypto.
- [x] Implement documented key derivation/session-key, lock, logout and cache-expiry behaviour.
- [x] Implement encrypted idempotent offline outbox and conflict-safe sync.
- [x] Add audit events without sensitive transcript logging.

## Phase 7 — Judging readiness
- [x] Run all acceptance scenarios in PRD.md.
- [x] Test noisy audio and multiple number formats.
- [x] Test duplicate names and correction handling.
- [x] Measure end-of-speech-to-first-audio latency (< 2s target verified).
- [x] Test on mobile and desktop viewports.
- [x] Verify no secrets in Git history/client bundle.
- [x] Create comprehensive README with setup, architecture diagram, and demo steps.
- [x] Run lint, typecheck, tests and production build.
