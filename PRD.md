# PRD — KhataAI: Voice Khata for Kirana Stores (Advanced Edition)

## 1. Product overview
KhataAI is a voice-first digital ledger for small Indian kirana stores. It replaces paper udhaar entries with natural spoken commands, accurate transaction handling, and spoken balance queries. It is optimized for busy counters, Hindi/Hinglish code-mixed speech, background noise, low-end Android devices, responsive desktop/tablet use, and minimal screen interaction.

## 2. Problem
Shopkeepers often record customer credit and payments in paper khata books. During rush hour, typing into an app is impractical. Existing generic voice assistants may mishear Indian number words, confuse credit with payment, fail on code-mixing, or hallucinate financial results.

## 3. Goals
- Record customer credit and payments using push-to-talk.
- Correctly parse amounts in Hindi, English, and supported code-mixed speech.
- Handle relative dates, spoken corrections, and multi-turn context memory.
- Resolve duplicate customer names through short spoken clarification.
- Support personalized customer aliases (e.g., "Master ji", "Sharma ji").
- Voice-based on-the-fly customer registration.
- Answer customer balance and daily total queries by voice.
- Provide comprehensive Daily Closing Reports and deterministic AI business analytics.
- Generate downloadable PDF transaction receipts and customer statements.
- Enable auditable transaction undo via append-only reversal records.
- Optional voice-driven inventory management module.
- Work as a responsive website on desktop/tablet and as an installable PWA on Android.
- Keep financial calculations 100% deterministic, audit-logged, and secure.

## 4. Non-goals
- Lending, credit scoring, interest charging, or aggressive automated collections.
- Automated unsolicited spam messaging (reminders are opt-in, polite, and disabled by default).
- Fully offline speech recognition unless a verified on-device model is added.
- Continuous background wake-word listening (push-to-talk ensures merchant privacy).
- Multi-branch enterprise ERP / GST accounting.
- Direct LLM writing to ledger tables (all writes must pass through deterministic validation).

## 5. Primary users
**Kirana Shopkeeper:** Owner or staff member who speaks naturally while serving customers at the counter. May have limited digital literacy and prefers Hindi/Hinglish with minimal physical screen taps.

## 6. Core user journeys

### A. Record credit with multi-turn context
1. Shopkeeper: "Ramesh ka 340 udhaar."
2. Assistant: "Ramesh ke naam ₹340 udhaar darj ho gaya."
3. Shopkeeper: "Usne 100 rupaye diye." (Context memory binds "usne" to Ramesh)
4. Assistant: "Ramesh ne ₹100 jama kiye. Bacha hua baaki ₹240 hai."

### B. Spoken correction and immediate undo
1. Shopkeeper: "Suresh ka 200 udhaar."
2. Before commit: "Nahi, 250." -> Assistant updates pending draft to ₹250.
3. After commit: "Pichhla hisaab undo karo." -> Assistant generates an auditable reversal entry; original transaction remains untouched.

### C. Voice customer creation & aliases
1. Shopkeeper: "Nukkad wale Master ji ka 150 udhaar."
2. Resolver checks customer aliases: "Master ji" maps to customer "Ramesh Sharma".
3. If unknown: "Pooja Verma naye grahak hain. Kya naya khata banayein?" -> Confirmed by voice or tap.

### D. Daily closing & analytics
1. "Aaj ka hisaab dikhao" -> Generates Daily Closing Report (Today's credit, cash collected, net change, active customers).
2. "Kaunse grahak ka sabse zyada baaki hai?" -> Deterministic database query returns ranked debtors.

### E. PDF receipt generation
1. Shopkeeper or customer requests a slip -> App generates a formatted PDF receipt with store header, timestamp, and running balance.

### F. Optional voice inventory
1. "Atta ka stock kitna hai?" -> Returns current stock quantity from modular inventory engine.

## 7. Functional requirements
- FR-01: Push-to-talk audio capture with live microphone streaming and fallback.
- FR-02: Streaming STT adapter (Gnani Prisma STT / Web Speech API).
- FR-03: Language selection (Hindi, Hinglish, English) with Devanagari rendering.
- FR-04: Parse customer name, amount, direction, date, correction intent via Gemini 3.5 Flash Lite + deterministic rules.
- FR-05: Normalize rupee amounts to integer paise (1 INR = 100 Paise).
- FR-06: Deterministic number parser for Hindi/English words, colloquial slang.
- FR-07: Context-aware multi-turn voice sessions with short-lived memory (90-sec TTL).
- FR-08: Personalized customer aliases stored per shop and matched during resolution.
- FR-09: Voice-based customer registration on unrecognized names.
- FR-10: Append-only transaction ledger with zero destructive mutations.
- FR-11: Reversal entries (`REVERSAL`) linked to `reverses_transaction_id` with audit events.
- FR-12: Daily Closing Reports with credit, recovery, and net summaries.
- FR-13: Deterministic AI business analytics (aging analysis, recovery rates, top debtors).
- FR-14: PDF receipt generation for transactions and customer ledger cards.
- FR-15: Modular voice inventory management (opt-in via Settings).
- FR-16: Encrypted local storage using Web Crypto API AES-GCM-256.
- FR-17: Supabase PostgreSQL cloud sync with Row Level Security.
- FR-18: First-turn AI disclosure and polite opt-in customer reminders.

## 8. Non-functional requirements
- NFR-01: Responsive UI for desktop, tablet, and mobile; optimized touch targets (>=48px).
- NFR-02: Stationary desktop sidebar that never scrolls away with content.
- NFR-03: End-to-end voice roundtrip target < 2.0s for supported queries.
- NFR-04: Integer paise arithmetic for 100% financial precision (no floating-point drift).
- NFR-05: Strict idempotency keys on every transaction.
- NFR-06: Shop-level data isolation via Supabase RLS.
- NFR-07: No secrets in frontend client code (server proxy gateway).
- NFR-08: Clean empty state for new user accounts with zero leaked demo data.
