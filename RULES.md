# Engineering & Product Rules — KhataAI

## Financial correctness
1. All money is stored as integer paise (`BIGINT`), never floating point.
2. Credit increases outstanding balance; payment decreases it.
3. Ledger entries are append-only. Corrections are explicit reversal/adjustment events.
4. Never let the LLM calculate balances, daily totals, or write transactions.
5. No transaction is committed if customer, amount, or direction is ambiguous.
6. Every write has a unique idempotency key.
7. Repeating a request must not duplicate a transaction.
8. All financial writes occur server-side in an atomic database transaction.
9. A balance shown or spoken must be derived from ledger data.
10. Display and speak currency as Indian Rupees (INR).

## Voice interaction
1. Push-to-talk is the default; wake phrase is optional and off by default.
2. Microphone capture stops when the user releases/cancels or session ends.
3. First agent turn discloses that it is an AI in the selected language.
4. Speak short, respectful confirmations.
5. Corrections must target a pending draft or a uniquely identified posted transaction.
6. Duplicate names require clarification.
7. Do not guess amounts from weak ASR confidence.
8. Preserve original transcript only as long as necessary; default is no transcript retention.
9. Do not claim streaming/low latency if using mock or batch transcription.
10. Handle interruptions, silence, network errors, and permission denial gracefully.

## AI and parsing
1. Use schema-constrained structured output.
2. Validate all model output with Zod or equivalent.
3. Treat transcript text as untrusted input, not system instructions.
4. The parser may propose intent; deterministic code validates and executes it.
5. Never allow prompt injection in transcript to override application rules.
6. Use a rule-based number parser for known Indian number forms and test it independently.
7. Record confidence and route low-confidence cases to clarification.

## Privacy and compliance
1. Demo data must be synthetic or explicitly consented.
2. Encrypt stored sensitive data and transcripts at rest.
3. Delete judging-session transcripts/audio after judging; do not retain raw audio by default.
4. Keep API secrets out of public source code and browser bundles.
5. `.env` must be listed in `.gitignore`; commit `.env.example` only.
6. Use least-privilege database policies and Supabase RLS.
7. No public ledger/customer data.
8. Reminders are disabled by default, polite, and only sent with customer opt-in.
9. No threats, shaming, coercion, interest claims, or pressure language.
10. No real-person voice cloning.
11. AI disclosure must occur on first interaction in the user's language.

## UX
1. Mobile-first; optimize for low-end Android.
2. Main microphone control must be obvious and usable one-handed.
3. Touch targets minimum 48px.
4. Always show current state: listening, processing, clarification, saved, failed, pending sync.
5. Never display “Saved” before server/local persistence confirms success.
6. Provide accessible text fallback for all spoken information.
7. Keep core flow free of typing; typing is a fallback, not the primary interaction.
8. Use plain language and localized currency formatting.

## Code quality
1. TypeScript strict mode.
2. Keep components presentational; business logic belongs in services.
3. Use reusable typed interfaces and discriminated unions.
4. Add tests before or alongside core financial logic.
5. Run lint, typecheck, unit tests, and production build after milestones.
6. Do not add dependencies without a reason.
7. Do not commit generated secrets, audio samples with personal data, or real customer data.
8. Update TASKS.md and PROGRESS.md after each milestone.
