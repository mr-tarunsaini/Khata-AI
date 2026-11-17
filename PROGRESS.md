# KhataAI — Development Progress

> Update this file after every meaningful milestone. Record only work that is actually implemented and tested.

## Current status
- Stage: Phase 1 & Phase 2 Complete, End-to-End Demo Verified
- Build status: Production build passing (Vite + PWA + TypeScript + Tailwind v4)
- Test status: 26 unit tests passing (100% pass rate)
- Local Persistence: Web Crypto API AES-GCM + IndexedDB
- Speech Recognition: Web Speech API streaming + MockSpeechProvider for judging
- TTS: Web Speech API Indic voices with latency tracking (< 2s target verified)
- Last updated: 2026-11-17

## Product decisions
- Product Name: KhataAI
- Tagline: Bolo. Likho. Hisaab Jaano.
- Platform: Responsive Website + Installable PWA (desktop, tablet, Android mobile)
- Default First-Run Language: Hindi + Hinglish
- Primary Interaction: Large Push-to-Talk (88-112px touch target) with 10 explicit states
- Cloud Ledger Source of Truth: Supabase PostgreSQL with strict shop-level RLS
- Local Persistence: Web Crypto AES-GCM 256-bit encrypted IndexedDB
- Money Representation: Exact integer paise (BIGINT, zero floats)
- Timezone: Asia/Kolkata
- Spoken Number Parsing: Deterministic rules for digits, Hindi number words, English words, and Indian colloquial forms
- AI Role: Speech understanding and intent extraction only; financial balance arithmetic is 100% deterministic

## Milestone log

### M0 — Planning & Repository Inspection
- [x] Inspected workspace and cloned documentation from `KhataAI_Antigravity_Project_Pack`.
- [x] Initialized Git repository with comprehensive `.gitignore` ensuring `.env` is never committed.
- [x] Created `.env.example` with documented environment variables for Supabase and voice services.

### M1 — App Foundation & Design System (Phase 1)
- [x] Initialized Vite + React 19 + TypeScript + Tailwind CSS v4.
- [x] Configured PWA manifest (`manifest.webmanifest`), service worker (`vite-plugin-pwa`), app icons (`pwa-192x192.svg`, `pwa-512x512.svg`), and offline precaching.
- [x] Applied Indian fintech color palette:
  - Background: `#F8F7F2`
  - Primary: `#253B73`
  - Secondary/Action: `#087F6E`
  - Accent: `#E7A23B`
  - Text: `#17233B`
- [x] Implemented responsive website shell:
  - Desktop: Persistent left sidebar, quick statistics, main voice action
  - Tablet: Collapsible drawer
  - Mobile: Compact top header, bottom navigation bar with elevated hero microphone button
- [x] Created LanguageContext with Hindi (`hi`), Hinglish (`hi-en`), and English (`en`).
- [x] Built first-turn AI Disclosure Modal in Hindi/Hinglish complying with hackathon ethical requirements.
- [x] Built Demo Mode banner with one-click quick scenarios and synthetic data reset.
- [x] Created high-converting Landing Page with hero, how-it-works, voice interaction preview, and security guarantees.

### M2 — Ledger Core & Supabase Integration (Phase 2)
- [x] Money utility (`src/lib/money.ts`): integer paise arithmetic, rupee formatting (`formatINR`), spoken INR formatting (`formatSpokenINR`).
- [x] Relative date utility (`src/lib/dates.ts`): Asia/Kolkata timezone support for "aaj", "kal", "parso".
- [x] Idempotency key tracking (`src/lib/idempotency.ts`): rejection of duplicate submissions.
- [x] Deterministic Ledger Service (`src/services/ledger/ledgerService.ts`):
  - CREDIT: increases customer outstanding balance
  - PAYMENT: decreases customer outstanding balance
  - REVERSAL: append-only auditable reversal linking original transaction ID
  - Customer Balances: calculated deterministically from append-only transaction history
  - Daily Aggregates: today's credit and payment totals
- [x] Customer Resolver (`src/services/ledger/customerResolver.ts`):
  - Devanagari and Latin name normalization, honorific stripping ("ji", "bhai")
  - Duplicate customer disambiguation ("Ramesh Sharma ya Ramesh Gupta?")
- [x] Number Parser (`src/lib/numberParser.ts`):
  - Digits: "340", "200"
  - Hindi words: "teen sau chaalis", "paanch sau", "ek hazaar"
  - Fractional terms: "dedh sau", "dhaai sau"
  - English phrases: "three hundred forty", "three-forty"
- [x] Intent Parser (`src/services/parser/intentParser.ts`):
  - ADD_CREDIT, RECORD_PAYMENT, QUERY_CUSTOMER_BALANCE, QUERY_DAILY_CREDIT, QUERY_DAILY_PAYMENTS, CORRECT_PENDING_TRANSACTION, CLARIFY
  - Pending draft correction handling ("Nahi, 430")
- [x] Supabase PostgreSQL Schema & Security (`src/services/database/schema.sql`):
  - Tables: `shops`, `profiles`, `customers`, `ledger_transactions`, `audit_events`, `pending_voice_sessions`
  - Row Level Security (RLS) policies isolating records strictly by `shop_id`
  - Performance indexes on normalized names, dates, and idempotency keys
- [x] Web Crypto API AES-GCM 256-bit encryption for IndexedDB cache (`src/lib/crypto.ts`, `src/lib/indexedDb.ts`).
- [x] Complete UI Pages:
  - Landing Page (`src/components/landing/LandingPage.tsx`)
  - Main Dashboard (`src/components/dashboard/DashboardView.tsx`)
  - Voice Khata with 10 states (`src/components/voice/VoiceKhataView.tsx`)
  - Customers List & Detail Ledger (`src/components/customers/CustomersView.tsx`)
  - Transaction History & Filters (`src/components/ledger/TransactionsView.tsx`)
  - Settings & Web Crypto PIN Lock (`src/components/settings/SettingsView.tsx`)
  - Auth with 1-click instant demo access (`src/components/auth/AuthView.tsx`)

## Latest verification
- Lint/oxlint: Verified
- Typecheck: `tsc --noEmit` passing with 0 errors
- Unit tests: 26 passed in Vitest (`src/tests/ledger.test.ts`, `src/tests/parser.test.ts`)
- Production build: `vite build` completed in 7.59s with service worker and precache assets
- Latency target: Measured & reported (< 2s end-of-speech to audio start)
