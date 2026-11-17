# PRD — KhataAI: Voice Khata for Kirana Stores

## 1. Product overview
KhataAI is a voice-first digital ledger for small Indian kirana stores. It replaces paper udhaar entries with natural spoken commands, accurate transaction handling, and spoken balance queries. It is optimized for busy counters, Hindi/Hinglish code-mixed speech, background noise, low-end Android devices, responsive desktop/tablet use, and minimal screen interaction.

## 2. Problem
Shopkeepers often record customer credit and payments in paper khata books. During rush hour, typing into an app is impractical. Existing generic voice assistants may mishear Indian number words, confuse credit with payment, fail on code-mixing, or hallucinate financial results.

## 3. Goals
- Record customer credit and payments using push-to-talk.
- Correctly parse amounts in Hindi, English, and supported code-mixed speech.
- Handle relative dates and spoken corrections.
- Resolve duplicate customer names through short spoken clarification.
- Answer customer balance and daily total queries by voice.
- Work as a responsive website on desktop/tablet and as an installable PWA on Android.
- Keep financial calculations deterministic and auditable.

## 4. Non-goals
- Lending, credit scoring, interest, collections, or payment processing.
- Automatic customer messaging/reminders in MVP.
- Fully offline speech recognition unless a verified on-device model is added.
- Wake-word listening in MVP.
- Multi-branch enterprise accounting, GST filing, inventory, payroll.
- LLM-generated financial calculations.

## 5. Primary users
**Shopkeeper:** owner or staff member who speaks naturally while serving customers. May have limited digital literacy and may prefer Hindi/Hinglish or another local language.

## 6. Core user journeys
### A. Record credit
1. Shopkeeper holds microphone and says “Ramesh ka 340 udhaar”.
2. App streams audio to STT provider.
3. Parser extracts customer, amount, direction, and date.
4. Customer resolver finds a unique match.
5. App reads back “Ramesh ke naam ₹340 udhaar likh raha hoon.”
6. Depending on confidence/confirmation setting, user confirms verbally or the app commits after read-back.
7. App confirms “₹340 udhaar darj ho gaya.”

### B. Record payment
“Ramesh ne 200 diye” becomes a payment of ₹200, reducing outstanding balance.

### C. Correct entry
After an uncommitted draft, “Nahi, 430” changes the draft amount. The assistant repeats the corrected entry. For an already committed transaction, create a reversal/adjustment with audit linkage; never silently overwrite history.

### D. Duplicate customer
If two customers named Ramesh match, ask “Ramesh Sharma ya Ramesh Gupta?” No transaction is committed until the user selects one.

### E. Ask balance
“Ramesh ka total?” queries the deterministic ledger and returns a spoken balance.

### F. Ask daily totals
“Aaj kitna udhaar gaya?” returns the sum of today's credit entries. “Aaj kitna payment aaya?” returns payments received today.

## 7. Functional requirements
- FR-01: Push-to-talk audio capture with permission handling.
- FR-02: Streaming STT provider adapter; show partial/final transcript.
- FR-03: Configurable language selection and code-mix support.
- FR-04: Parse customer name, amount, direction, date, query/correction intent.
- FR-05: Normalize rupee amounts to integer paise.
- FR-06: Support Hindi number words, Arabic numerals, English number phrases, lakh/thousand forms.
- FR-07: Resolve relative dates using Asia/Kolkata.
- FR-08: Resolve customer names; clarify duplicates.
- FR-09: Maintain pending transaction state for corrections.
- FR-10: Append-only transaction ledger with audit history.
- FR-11: Calculate balance and daily totals deterministically.
- FR-12: Speak results through TTS provider adapter.
- FR-13: Dashboard, customer list/detail, transaction history.
- FR-14: Demo mode with seeded synthetic data.
- FR-15: Offline indicator and safe pending-sync handling.
- FR-16: User data export and deletion controls.
- FR-17: First-turn AI disclosure in selected language.
- FR-18: Polite opt-in reminders only, disabled in MVP.

## 8. Non-functional requirements
- NFR-01: Responsive UI for desktop, tablet and mobile; optimize the voice workflow for low-end Android.
- NFR-02: Large touch targets (>=48 CSS px).
- NFR-03: Voice answer first audio target <=2 seconds after question end for supported demo queries; measure and report.
- NFR-04: No financial write without validated intent and customer resolution.
- NFR-05: Idempotent writes; retries must not duplicate transactions.
- NFR-06: Secure data isolation per shop.
- NFR-07: No secrets in client bundle or Git.
- NFR-08: Transcript/audio retention minimized and documented.
- NFR-09: Graceful provider/network failure and retry.
- NFR-11: Local cached ledger data and queued transactions must be encrypted at rest using a documented Web Crypto key-management design.
- NFR-10: WCAG-minded contrast, text scaling, keyboard accessibility.

## 9. Success metrics / judging metrics
- Exact amount match rate on a curated noisy test set.
- Correct credit/payment direction rate.
- Correction success rate and zero silent mutation.
- Duplicate-name clarification correctness.
- Median and P95 end-of-speech-to-first-audio latency.
- Successful transaction completion rate.
- Duplicate-write count (target zero).
- Offline/online sync correctness.

## 10. Demo acceptance scenarios
1. “Ramesh ka 340 udhaar” → credit +₹340.
2. “Ramesh ne 200 diya” → payment −₹200.
3. “Ramesh ka total?” → ₹140 outstanding.
4. “Nahi, 430” while draft is pending → draft amount corrected to ₹430, read-back required.
5. Two Ramesh records → spoken disambiguation.
6. “Kal” and “parso” → dates resolved against Asia/Kolkata.
7. “Aaj kitna udhaar gaya?” → sum of today's credits.
8. Simulated provider outage → clear error, no false success.
9. Repeat same request ID → no duplicate ledger entry.

## 11. Assumptions and decisions
- Product name KhataAI is provisional.
- Platform is a responsive website plus installable PWA, not a native Android app.
- Hindi + Hinglish is the first supported experience; add language packs after provider access is verified.
- Supabase is the cloud source of truth; IndexedDB stores only encrypted local cache and safe queued operations.
- Real Gnani API credentials and terms must be obtained directly from Gnani.
