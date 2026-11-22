# Design System — KhataAI (Advanced Edition)

## Product personality
Trustworthy, calm, practical, local, and fast. The interface should feel like a reliable digital khata book—not a complex banking dashboard or a flashy AI chatbot.

## Visual direction
- Background: warm ivory/off-white (`#F8F7F2`).
- Primary: deep indigo/navy (`#253B73`).
- Action: emerald/teal (`#087F6E`).
- Accent: saffron/orange (`#E7A23B`), used sparingly for attention.
- Success: accessible green (`#16794B`).
- Warning: amber (`#A86408`).
- Error: red (`#B42318`) with clear text, never color alone.

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
- Highly legible sans-serif with Noto Sans & Noto Sans Devanagari font fallback.
- Large numerals for balances with ₹ symbol.
- High contrast, avoiding thin weights.

## Platform and responsive strategy
- Responsive web application + installable Progressive Web App (PWA).
- Desktop: **Stationary Fixed Left Sidebar**; central `<main>` area scrolls independently.
- Mobile: Compact top bar, hero push-to-talk button, and bottom navigation bar.

## Advanced Feature Component Designs

### 1. Multi-Turn Session Memory Feedback
- When pronouns (`usne`, `inka`) are bound, an active session pill appears:
  `[ 👤 रमेश कुमार (सत्र सक्रिय) • 60s ]`
- Provides instant visual confirmation of who the conversation is referring to.

### 2. Customer Aliases UI (`CustomersView`)
- Displays badges under customer name: e.g. `[मास्टर जी]`, `[दुकानदार]`, `[नुकड़ वाले]`.
- Inline quick-add tag input for new aliases.

### 3. Voice Customer Creation Banner
- When an unknown name is spoken:
  - App displays a soft saffron prompt: *"रमेश शर्मा नए ग्राहक हैं। क्या नया खाता खोलें?"*
  - Dual action: Spoken "हाँ" or single-tap `[ ✅ नया खाता बनाएं ]` / `[ ❌ रद्द करें ]`.

### 4. Daily Closing Report View (`DailyClosingModal`)
- Metric cards:
  - आज का कुल उधार (Credit Extended)
  - आज की कुल वसूली (Payments Collected)
  - आज का नेट बकाया (Net Ledger Delta)
  - सक्रिय ग्राहक (Active Customers)
- Top 3 transactions list + Spoken overview button + Export PDF button.

### 5. AI Business Analytics Panel (`AnalyticsView`)
- Debt Aging Buckets:
  - 🟢 0–7 दिन (Recent: 100% normal)
  - 🟡 8–15 दिन (Follow-up due)
  - 🟠 16–30 दिन (Overdue alert)
  - 🔴 30+ दिन (High risk debtors)
- Collection Efficiency Gauge (वसूली दर %): `Payments / Credits`.
- Top 5 Credit Customers (उधार सांद्रता).

### 6. PDF Transaction Slip Design
- Clean 80mm thermal-friendly or A4 formatted digital slip:
  - Header: Shop Name, Address, Owner Name, Date & Time.
  - Body: Customer Name, Transaction ID, Type (उधार / जमा), Amount.
  - Summary: Previous Balance, Current Transaction, Updated Outstanding Balance.
  - Footer: "खाताAI द्वारा प्रमाणित डिजिटल पर्ची".

### 7. Instant Undo Toast
- Appears floating at the bottom after transaction creation:
  `[ ↺ ₹340 उधार दर्ज हुआ • वापस लें (Undo) • 5s ]`
- Clicking initiates an auditable reversal transaction without deleting history.

### 8. Optional Inventory Module UI
- Accessible via Settings toggle: "इन्वेंट्री प्रबंधन सक्षम करें".
- Cards show Item Name, Stock Level (units/kg), Low Stock Warning Badge (`अल्प स्टॉक`), and voice restock trigger.
