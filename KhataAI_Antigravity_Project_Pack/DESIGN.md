# Design System — KhataAI

## Product personality
Trustworthy, calm, practical, local, and fast. The interface should feel like a reliable digital khata book—not a complex banking dashboard or a flashy AI chatbot.

## Visual direction
- Background: warm ivory/off-white.
- Primary: deep indigo/navy.
- Action: emerald/teal.
- Accent: saffron/orange, used sparingly for attention.
- Success: accessible green.
- Warning: amber.
- Error: red with clear text, never color alone.

Suggested tokens:
```css
:root {
  --background: #F8F7F2;
  --surface: #FFFFFF;
  --surface-muted: #F0F1ED;
  --foreground: #17233B;
  --muted: #667085;
  --primary: #253B73;
  --primary-foreground: #FFFFFF;
  --action: #087F6E;
  --action-foreground: #FFFFFF;
  --accent: #E7A23B;
  --border: #E3E5E0;
  --success: #16794B;
  --warning: #A86408;
  --danger: #B42318;
  --radius: 16px;
}
```

## Typography
- Use a highly legible sans-serif with Devanagari coverage (e.g. Noto Sans / Noto Sans Devanagari).
- Large numerals for balances.
- Avoid thin font weights.
- Support system font scaling.

## Platform and responsive strategy
Build one responsive website that can also be installed as a PWA. Desktop, tablet and mobile share the same information architecture; only layout density and navigation adapt. Do not hide core ledger functions on desktop.

## Layout
### Mobile voice home
1. Top bar: KhataAI logo, shop name, connectivity status.
2. Greeting/status: short text in selected language.
3. Main mic control: large circular or rounded-square push-to-talk button.
4. Listening/processing visual: waveform or animated bars, plus text label.
5. Live transcript card.
6. Last transaction confirmation card.
7. Today's summary: credit, payments, outstanding.
8. Bottom navigation: Home, Customers, History, Settings.

### Desktop (responsive website)
- Persistent left navigation rail.
- Main voice action and recent activity in the central column.
- Summary cards and quick customer lookup in a right-side column where space allows.
- Full customer and transaction management views.

### Tablet
- Collapsible navigation or compact top navigation.
- Adaptive two-column layout; stack cards when width is constrained.

### PWA/mobile
- Installable PWA with app-like shell and compact bottom navigation.
- Main voice workflow remains one-handed and prominent.
- Maintain mobile-first hierarchy.

## Voice control states
- Idle: “बोलने के लिए दबाकर रखें” / equivalent localized hint.
- Listening: clear active ring and waveform; “सुन रहा हूँ…”
- Processing: progress indicator; “समझ रहा हूँ…”
- Clarification: highlighted question with one-tap fallback options.
- Saving: “खाते में दर्ज कर रहा हूँ…”
- Success: green check and spoken confirmation.
- Error: plain-language explanation and retry.
- Offline: persistent banner and explicit sync status.

Do not rely on color or animation alone to communicate state.

## Components
- `PushToTalkButton`
- `VoiceSessionStatus`
- `LiveTranscript`
- `IntentPreview`
- `ClarificationPrompt`
- `BalanceSummaryCard`
- `CustomerListItem`
- `LedgerTransactionRow`
- `DailyTotalsCard`
- `ConnectivityBadge`
- `LanguageSelector`
- `PrivacySettings`

## Interaction rules
- Minimum 48px touch target; mic target ideally 88–112px.
- Push-to-talk must work with pointer, touch, and keyboard.
- Release ends capture; cancel gesture/action cancels safely.
- Provide clear permission instructions.
- Avoid unnecessary modals.
- Use short confirmations; no long chatbot bubbles.
- Make customer balance and transaction direction visually distinct.
- Confirm destructive actions such as deleting a customer or clearing demo data.

## Responsive and accessibility
- Test widths 320px, 360px, 390px, 768px, 1024px.
- Contrast should meet WCAG AA where practical.
- Use semantic buttons and labels.
- Respect `prefers-reduced-motion`.
- Keep controls usable with screen readers and keyboard.
- Avoid tiny tables; use stacked cards on narrow screens.

## Brand copy
Product: **KhataAI**
Tagline: **Bolo. Likho. Hisaab Jaano.**
English support line: **Speak naturally. Keep every khata accurate.**


## Hindi/Hinglish content direction
- Hindi/Hinglish is the default first-run language.
- Use short, natural shop-counter phrases rather than formal translations.
- Provide Devanagari and Latin-script-friendly font fallback.
- Keep amounts and customer names visually prominent.
- Avoid overly technical English in shopkeeper-facing messages; technical settings can use English where appropriate.
