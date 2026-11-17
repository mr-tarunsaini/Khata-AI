# KhataAI — Development Progress

> Update this file after every meaningful milestone. Record only work that is actually implemented and tested.

## Current status
- Stage: Finalized product plan / repository inspection pending
- Build status: Not yet verified
- Live Gnani integration: Not yet verified
- Demo mode: Not yet implemented
- Last updated: 2026-11-17

## Product decisions
- Working name: KhataAI
- Primary platform: Responsive website + installable PWA (desktop, tablet and Android mobile)
- First supported language: Hindi + Hinglish
- Primary interaction: Push-to-talk
- Ledger source of truth: Supabase PostgreSQL
- Local persistence: encrypted IndexedDB cache and optional encrypted offline outbox
- Money representation: Integer paise
- Timezone: Asia/Kolkata
- AI role: Speech understanding and intent proposal only
- Financial logic: Deterministic backend services

## Milestone log
### M0 — Planning
- [x] Problem statement decomposed into product requirements.
- [x] Initial architecture and engineering rules documented.
- [x] Hackathon acceptance scenarios documented.
- [x] Finalized Hindi + Hinglish language direction.
- [x] Finalized responsive website + PWA platform.
- [x] Finalized Supabase + encrypted local cache storage direction.
- [ ] Repository inspected.
- [ ] Existing stack and constraints recorded.

### M1 — Foundation
- [ ] App shell
- [ ] PWA setup
- [ ] Demo mode
- [ ] AI disclosure

### M2 — Ledger core
- [ ] Customers
- [ ] Credit/payment transactions
- [ ] Balance calculations
- [ ] Corrections and audit trail
- [ ] Idempotency tests

### M3 — Voice pipeline
- [ ] Push-to-talk
- [ ] Mock STT/TTS
- [ ] Gnani STT
- [ ] Gnani TTS
- [ ] Intent parser

### M4 — Complete demo
- [ ] Spoken queries
- [ ] Duplicate-name clarification
- [ ] Relative dates
- [ ] Correction handling
- [ ] Latency measurements

## Known risks
- Gnani credentials, quotas, endpoint access and permitted hackathon usage must be confirmed.
- Browser audio capture and real-time streaming require a backend gateway; do not expose provider secrets.
- Speech recognition can mishear amounts in noise; confidence gates and explicit clarification are essential.
- Browser/PWA background operation is limited; push-to-talk is more reliable than wake phrase for the MVP.
- Offline financial writes require tested Web Crypto key management, encrypted IndexedDB, idempotency and conflict handling; avoid unsafe plaintext queues.

## Latest verification
- Lint: Not run
- Typecheck: Not run
- Unit tests: Not run
- Production build: Not run
- Device testing: Not run
- Live API test: Not run

## Next actions
1. Inspect the existing repository.
2. Implement deterministic ledger and tests before AI integration.
3. Build mock voice flow to guarantee a repeatable judge demo.
4. Integrate Gnani only after verifying credentials and current docs.
5. Measure accuracy and latency with a fixed test corpus.
