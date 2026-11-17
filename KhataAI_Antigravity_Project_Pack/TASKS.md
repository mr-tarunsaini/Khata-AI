# Implementation Tasks — KhataAI

Use `[ ]` todo, `[/]` in progress, `[x]` complete. Do not mark complete without implementation and verification.

## Phase 0 — Repository discovery
- [ ] Inspect repository, framework, scripts, existing components and backend.
- [ ] Read all project guidance files.
- [ ] Record current state and risks in PROGRESS.md.
- [ ] Confirm Gnani credentials, service access, supported languages, quotas and API contract.
- [ ] Confirm deployment target and Supabase project availability.

## Phase 1 — App foundation
- [ ] Configure TypeScript strict mode, lint, formatting and tests.
- [ ] Build responsive website shell and navigation for desktop, tablet and mobile.
- [ ] Set Hindi/Hinglish as first-run default; add natural localized copy for core voice flows.
- [ ] Add PWA manifest, service worker, installability and offline app shell.
- [ ] Add language selector and first-turn AI disclosure.
- [ ] Add `.env.example` and verify `.env` is ignored.
- [ ] Add demo mode banner and synthetic seed data.

## Phase 2 — Ledger core (highest priority)
- [ ] Define money utility using integer paise.
- [ ] Implement deterministic credit/payment service.
- [ ] Implement customer CRUD and normalized name matching.
- [ ] Implement duplicate-name resolver.
- [ ] Implement append-only correction/reversal model.
- [ ] Implement idempotency handling.
- [ ] Implement customer balance and daily aggregates.
- [ ] Add unit tests for all ledger operations.

## Phase 3 — Voice UX and provider adapters
- [ ] Implement push-to-talk control and microphone permission handling.
- [ ] Implement audio capture, cancellation and state machine.
- [ ] Define SpeechProvider interface.
- [ ] Implement MockSpeechProvider with scripted judging scenarios.
- [ ] Verify official Gnani STT API contract.
- [ ] Implement Gnani STT streaming adapter server-side.
- [ ] Verify official Gnani TTS API contract.
- [ ] Implement Gnani TTS adapter server-side.
- [ ] Add provider timeout, retry, rate-limit and error handling.

## Phase 4 — Parsing and conversation state
- [ ] Implement Hindi/English number parser.
- [ ] Support numeric, Hindi number words and English number phrases.
- [ ] Parse credit/payment direction.
- [ ] Parse “kal” and “parso” with Asia/Kolkata.
- [ ] Implement strict intent schema and validation.
- [ ] Implement confidence thresholds and clarification.
- [ ] Implement pending draft correction (“nahi, 430”).
- [ ] Ensure transcript cannot trigger arbitrary tool actions.
- [ ] Add parser and conversation-state tests.

## Phase 5 — UI surfaces
- [ ] Build voice-first home screen.
- [ ] Build live transcript and intent preview.
- [ ] Build spoken clarification UI.
- [ ] Build customer list/search.
- [ ] Build customer detail and running ledger.
- [ ] Build transaction history and filters.
- [ ] Build daily summary dashboard.
- [ ] Build settings, privacy and demo reset controls.

## Phase 6 — Persistence and security
- [ ] Create Supabase schema/migrations.
- [ ] Configure Auth and shop membership.
- [ ] Add and test RLS policies.
- [ ] Move provider secrets to server environment.
- [ ] Add transcript/audio retention controls.
- [ ] Add export/delete flows.
- [ ] Implement AES-GCM encrypted IndexedDB cache using Web Crypto.
- [ ] Implement documented key derivation/session-key, lock, logout and cache-expiry behaviour.
- [ ] Implement encrypted idempotent offline outbox and conflict-safe sync.
- [ ] If encryption/key management is not verified, disable offline financial writes and document the limitation.
- [ ] Add audit events without sensitive transcript logging.

## Phase 7 — Judging readiness
- [ ] Run all acceptance scenarios in PRD.md.
- [ ] Test noisy audio and multiple number formats.
- [ ] Test duplicate names and correction handling.
- [ ] Measure end-of-speech-to-first-audio latency.
- [ ] Test on low-end Android and narrow screens.
- [ ] Verify no secrets in Git history/client bundle.
- [ ] Create README with setup, architecture diagram, Gnani services and demo steps.
- [ ] Record 2–3 minute demo video.
- [ ] Prepare live judge demo script and fallback demo mode.
- [ ] Run lint, typecheck, tests and production build.
