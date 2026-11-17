# Antigravity Build Prompt — KhataAI

You are a senior product engineer, UX designer, backend architect, and QA engineer. Build **KhataAI**, a voice-first digital udhaar ledger for Indian kirana stores, based on the BOL Bharat Hackathon PS2 problem statement.

## Mission
Create a working, mobile-first web application/PWA that a shopkeeper can operate hands-free while serving customers. The shopkeeper presses and holds a large microphone button, speaks naturally in Hindi/Hinglish (and a configurable supported Indic language), and receives a spoken confirmation. The app must accurately record credit (udhaar), payments, corrections, customer balances, and spoken balance queries.

This is a ledger product, NOT a generic chatbot. Financial correctness is more important than conversational cleverness.

## First actions
1. Inspect the existing repository before changing anything. Identify framework, scripts, current components, environment setup, and existing backend.
2. Preserve working code and conventions. Do not replace the stack without a compelling reason.
3. Read and follow `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, `TASKS.md`, and `PROGRESS.md`.
4. Write a concise implementation plan, then implement in small testable milestones. Update `TASKS.md` and `PROGRESS.md` as work proceeds.
5. Do not pretend an API is integrated when credentials or access are missing. Implement a clearly labelled demo/mock provider and a clean adapter interface until real credentials are configured.

## Finalized product decisions (do not change without asking)
- Language: Hindi + Hinglish first. UI copy, AI disclosure, confirmations, clarification prompts, and demo scenarios must prioritize Hindi/Hinglish.
- Platform: responsive website + installable PWA. Support desktop, tablet, and Android mobile; optimize the primary voice workflow for mobile shop counters.
- Storage: Supabase as the cloud source of truth plus encrypted IndexedDB local cache. Offline writes are allowed only when encryption, key handling, idempotency, and conflict-safe sync are implemented and tested. Otherwise keep offline mode read-only and explain why.

## Preferred stack (adapt to existing repo)
- React + TypeScript + Vite; responsive website plus installable PWA. Design responsively for desktop, tablet, and Android mobile; prioritize the shop-counter mobile experience without making desktop a second-class experience.
- Tailwind CSS and shadcn/ui (or existing UI system).
- Supabase PostgreSQL + Auth + Row Level Security as the primary shared ledger store.
- IndexedDB for an encrypted local cache and explicitly confirmed offline transaction queue; service worker for PWA. Use Web Crypto API with a key derived from a user-entered PIN/passphrase (or a carefully designed session key flow); never store the raw key. If secure key management cannot be implemented and tested, disable offline financial writes rather than persist plaintext financial data.
- Backend/serverless functions for all secret-bearing integrations.
- Gnani Prisma STT streaming and Gnani Timbre TTS where credentials and current API access are available.
- Gemini (or another configured LLM) may help convert transcript text into a strict transaction intent JSON. It must never calculate balances or directly write database records.
- Zod for schema validation; Vitest/Playwright for tests.

## Required experience
### 1. First-run onboarding
- Start in Hindi/Hinglish; allow the shopkeeper to change language when other configured languages are available.
- Explain clearly, in the selected language, that this is an AI assistant.
- Ask the shopkeeper to create/unlock a local shop profile and set a PIN if authentication is enabled.
- Show privacy explanation: what is stored, where, and how to delete demo data.
- Provide synthetic sample customers only in demo mode.

### 2. Voice home screen
- One very large push-to-talk control, designed for one-handed use.
- States: idle, requesting microphone, listening, processing, clarification required, saving, success, error, offline.
- Show live transcript and parsed intent as readable text, but never require typing during normal operation.
- Haptic/audio feedback where browser/device support exists.
- Push-to-talk is the required MVP. Wake phrase is optional and must be disabled by default.
- Allow tap-to-cancel/stop. Do not keep the microphone active after the session ends.
- Use microphone permission gracefully and explain denial/fallback.

### 3. Voice transaction understanding
Support examples such as:
- “Ramesh ka 340 udhaar”
- “Ramesh ko 200 diye”
- “Ramesh ne kal 200 diya tha”
- “Suresh ke 500 rupaye jama karo”
- “Ramesh ka total kitna hai?”
- “Aaj kitna udhaar gaya?”
- “Nahi, 430”
- “Correction: amount 430, not 340”

Extract a strict intent object:
{
  "intent": "ADD_CREDIT | RECORD_PAYMENT | QUERY_CUSTOMER_BALANCE | QUERY_DAILY_CREDIT | QUERY_DAILY_PAYMENTS | CORRECT_PENDING_TRANSACTION | CLARIFY",
  "customer_name": "string | null",
  "amount_paise": "integer | null",
  "transaction_date": "YYYY-MM-DD | null",
  "relative_date_phrase": "string | null",
  "currency": "INR",
  "confidence": "0..1",
  "source_transcript": "string",
  "correction_target": "PENDING_TRANSACTION | null",
  "clarification_reason": "string | null"
}

Amounts must be parsed into integer paise (₹340.00 = 34000 paise) and displayed as INR. Never use floating-point arithmetic for money. Parse spoken Indian number forms (including lakh/thousand) and English number forms. Treat ambiguous “three-forty” as ₹340 only when the parser confidence and context support it; otherwise ask a short clarification.

### 4. Deterministic ledger rules
- Credit increases the customer's outstanding balance.
- Payment decreases the customer's outstanding balance.
- Every transaction is append-only and auditable.
- Corrections must create a reversal/adjustment record or update a clearly pending, uncommitted draft; never silently mutate a committed transaction.
- If user says “nahi, 430” immediately after an uncommitted draft, replace the draft amount and repeat it for confirmation.
- If correction target is unclear, ask which transaction to correct.
- Resolve “kal” and “parso” using the shop's configured timezone (`Asia/Kolkata`) and current date. Store absolute date and original phrase.
- If two or more customers match a spoken name, ask a concise spoken disambiguation question, e.g. “Ramesh Sharma ya Ramesh Gupta?”
- Do not create a transaction when amount, direction, or customer is uncertain.
- Require explicit confirmation for low-confidence or high-impact ambiguity. For clear intents, give a concise spoken read-back before commit or use a configurable confirmation mode.
- Use database transactions / atomic operations to prevent duplicate writes.
- Add idempotency keys to prevent repeated writes from retries.
- Compute balances from ledger entries or a transactionally maintained balance with reconciliation tests. Never trust an LLM-provided balance.

### 5. Spoken answers
Answer with concise TTS in the selected language:
- “Ramesh ka total udhaar ₹540 hai.”
- “Aaj ₹1,240 ka udhaar gaya.”
- “Aaj ₹600 payment mila.”
- “Is naam ke do customer hain. Ramesh Sharma ya Ramesh Gupta?”

Target: answer begins within 2 seconds after the question ends under the demo conditions. Measure separately: end-of-speech to transcript, intent, database/query result, and first TTS audio. Do not claim the target is met unless measured.

### 6. Dashboard and ledger views
Build a polished dashboard with:
- Today's credit, today's payments, total outstanding, customer count.
- Searchable customer list with name, phone suffix (if consented), outstanding balance, last activity.
- Customer detail page with chronological ledger and running balance.
- Transaction history with filters for date, credit/payment, customer.
- Add customer manually as a fallback.
- Export ledger CSV only after explicit user action.
- Clear demo-data reset action.

### 7. Offline behaviour
- Detect offline state.
- Do not pretend cloud writes succeeded while offline.
- Queue encrypted/persisted pending operations locally only if the implementation can protect them; otherwise show a clear unavailable state.
- Use client-generated idempotency IDs and sync status.
- On reconnect, resolve conflicts safely; never silently overwrite ledger records.
- Show “Pending sync” visibly and prevent duplicate sync.

## Gnani integration requirements
Create `SpeechProvider` interfaces, for example:
- `transcribeStream(audioStream, language, callbacks)`
- `synthesizeSpeech(text, language, voice?)`
Implement `GnaniSpeechProvider` only against the currently documented Gnani API contract. Keep credentials on the server. Never expose API keys, tokens, certificates, or service credentials in browser code or public repository. Add `.env.example` with variable names and placeholders only. If the exact credentials/API access are unavailable, implement `MockSpeechProvider` with prerecorded/demo transcript scenarios and mark it as DEMO mode.

The Gnani platform documentation currently describes Prisma streaming STT and Timbre TTS options. Verify exact endpoint, authentication, payload, supported language codes, limits, and transport against the official docs before coding. Do not copy old gRPC credentials or sample secrets into the project.

## Security, privacy and compliance
- Synthetic or explicitly consented data only in demo.
- Encrypt transcripts and sensitive data at rest where stored; do not retain raw audio by default.
- Delete demo transcripts/audio after the judging session or configured short retention period.
- Add user-triggered delete/export controls.
- Use Supabase RLS per shop/user. No public read/write policies.
- Validate every request server-side.
- Keep API keys in environment variables, `.env` ignored by Git.
- Add `.env.example`; verify `.env` is in `.gitignore`.
- No lending, interest calculation, debt collection pressure, threats, or coercive language.
- Any reminders must be polite, opt-in, and disabled by default.
- Never clone a real person's voice. Use licensed/provider-approved synthetic voices.
- No medical advice features.
- Include AI disclosure on first interaction in the selected language.
- Do not log full transcripts, customer names, phone numbers, or secrets in production logs.

## Quality and demo requirements
Create a demo mode that works without external API keys and demonstrates:
1. AI disclosure in Hindi.
2. “Ramesh ka 340 udhaar” creates a ₹340 credit.
3. “Ramesh ne 200 diya” records a ₹200 payment.
4. “Ramesh ka total?” answers ₹140 outstanding.
5. “Nahi, 430” corrects the most recent pending transaction safely; demonstrate the correction flow and resulting balance.
6. Duplicate-name clarification.
7. Daily totals query.
8. Noisy-audio test scenario or replayable audio sample (synthetic/consented only).

Add unit tests for number parsing, direction, relative dates, correction state machine, duplicate customer matching, balance arithmetic, idempotency, and RLS assumptions. Add a README with setup, architecture diagram, Gnani services used, environment variables, limitations, and demo steps.

## Responsive platform requirements
- Deliver a responsive website and installable PWA from the same codebase.
- Desktop: full dashboard navigation, customer search, ledger history and voice interaction.
- Tablet: adaptive two-column layout where practical.
- Mobile: compact navigation and one-handed push-to-talk workflow.
- Verify installability, manifest, service worker, offline shell, and microphone permissions on Android Chrome.

## Visual design direction
Premium but approachable Indian retail SaaS. Warm off-white background, deep indigo/navy text, emerald/teal action colour, saffron accent used sparingly. Large readable typography, generous touch targets (minimum 48px), high contrast, minimal navigation. The microphone is the hero. Make the UI usable on low-end Android screens and narrow widths. Avoid dense admin-dashboard styling.

## Execution rules
- Do not stop after creating a landing page or static mockup.
- Build functional end-to-end flows with persistent demo ledger.
- Do not invent successful STT/TTS responses. Clearly distinguish mock from live.
- Do not put business logic in UI components.
- Do not let an LLM directly modify financial records.
- Do not use floating-point money.
- Do not silently commit uncertain transactions.
- Keep all files typed, modular, documented, and testable.
- At the end of each milestone, run lint, typecheck, tests, and build; report actual results.
- Update `PROGRESS.md` after each milestone and leave `TASKS.md` with remaining work.
