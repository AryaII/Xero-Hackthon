# Cash Flow Growth Agent — Build Spec for Lovable

Build a single-page React web app that visualizes an AI agent analyzing a small business's cash flow using Xero data. This is a demo/prototype — all data is mocked in the frontend. No backend, no auth, no real API calls.

## Stack

- React + TypeScript
- Tailwind CSS
- shadcn/ui components (Card, Button, Badge, Progress, Tabs, Dialog, Tooltip)
- Recharts for all charts
- lucide-react for icons
- framer-motion for step animations

## Overall Layout

Single page, no routing. Top-to-bottom structure:

1. Top bar (fixed height 64px)
2. Hero KPI strip
3. Main tabs: "Agent Thinking" | "Dashboard" | "Actions Timeline"
4. Content area (switches by tab)

Max width 1280px, centered. Background `#FAFAF7` (warm off-white). All cards white with 0.5px border `#E5E5E0`, rounded-xl (12px), padding 20px.

## Color System

Define these Tailwind custom colors:

```
brand-ink: #1A1A17     (primary text)
brand-mute: #6B6B65    (secondary text)
brand-line: #E5E5E0    (borders)
brand-bg: #FAFAF7      (page)
brand-card: #FFFFFF    (cards)

state-green: #0F6E56 / bg #E1F5EE   (healthy, auto-completed)
state-amber: #BA7517 / bg #FAEEDA   (warning, needs approval)
state-red:   #A32D2D / bg #FCEBEB   (danger, cash gap)
state-blue:  #185FA5 / bg #E6F1FB   (info, reasoning)
state-purple:#534AB7 / bg #EEEDFE   (agent thinking, hypothesis)
```

Font: Inter for UI, JetBrains Mono for numbers and timestamps.

## Top Bar

Fixed at top, white bg, 0.5px bottom border.
- Left: logo (a lucide `Sparkles` icon in purple + text "CashFlow Agent" in 16px bold ink)
- Center: pill dropdown showing "Demo Company (UK)" with `Building2` icon
- Right: two icon buttons `Bell` (with red dot indicator), `Settings`; then avatar circle with initials "SC"

## Hero KPI Strip

Row of 4 KPI cards, gap 12px, below top bar with 24px top margin.

Each KPI card:
- Label (13px, brand-mute)
- Big number (28px, JetBrains Mono, brand-ink, weight 500)
- Trend indicator: small `TrendingUp` or `TrendingDown` icon + delta (12px)
- Bottom sparkline (Recharts LineChart, height 32px, no axes, monotone curve)

The 4 KPIs:

| Label | Value | Trend | Color |
|---|---|---|---|
| Available cash | £12,540 | ↓ £2,100 (30d) | state-amber |
| Cash health score | 42 / 100 | ↓ 18 pts | state-amber |
| Revenue at risk | £12,400 | ↑ £8,400 | state-red |
| Opportunities identified | 4 | ↑ 2 new | state-purple |

Sparkline data (12 points each, use these arrays):
- Cash: [18200, 17800, 17500, 16900, 16200, 15800, 15100, 14600, 14100, 13400, 12900, 12540]
- Health: [72, 70, 68, 65, 62, 58, 54, 51, 48, 46, 44, 42]
- Risk: [4000, 4200, 5100, 5800, 6900, 8100, 9400, 10500, 11200, 11800, 12100, 12400]
- Opps: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]

## Tab Navigation

shadcn Tabs component below KPI strip, 24px top margin.
Three tabs: "Agent Thinking", "Dashboard", "Actions Timeline".
Default active: "Agent Thinking".
Tab labels 14px, active has ink color + 2px purple underline.

---

## TAB 1: Agent Thinking (default)

This is the star of the demo. Shows the OODA loop animation.

### 1.1 OODA stepper bar

Horizontal bar at top of tab content, 48px height, bg brand-card, rounded-xl, padding 12px.
5 pills with connecting arrows, evenly spaced:

`(eye) Observe → (lightbulb) Orient → (target) Decide → (zap) Act → (refresh-cw) Learn`

State styles:
- Idle: gray icon, gray text, no bg
- Active: purple bg (state-purple/bg), purple text, subtle pulse animation
- Done: green checkmark icon, green text

Right side of bar: monospace clock "00:12" showing elapsed time.
Below the bar, on the right: three buttons "Restart", "Play/Pause", "Speed 1x/2x/4x" (cycles on click).

### 1.2 Three-column thinking panel

Grid of 3 equal columns, gap 16px, below stepper. Each column is a card, min-height 480px.

**Column 1: Observe**
- Header: `Eye` icon + "Observe" (16px bold) + status pill on right ("idle" gray / "running" purple / "done" green with count "6 sources")
- Subtitle: "Pulling Xero data in parallel" (12px mute)
- List of 6 data source rows, each row:
  - Icon (16px) + label (13px) + right-aligned value (12px mono)
  - Loading state: shows a spinner (Loader2 icon spinning) instead of value
  - Done state: shows value + small green check

The 6 data sources with mock values:
1. `Landmark` Bank balance → £12,540
2. `FileText` Aged receivables → 43 invoices
3. `Receipt` Aged payables → 28 bills
4. `TrendingUp` P&L trend (12mo) → £184k revenue
5. `Users` Contact history → 112 contacts
6. `Clock` Payment patterns → 18d avg DSO

Animation: fade in each row with 100ms stagger, then convert spinner→value with 200ms delay each row.

**Column 2: Orient**
- Header: `Lightbulb` icon + "Orient" + status pill ("analyzing" / "done, 4 hypotheses")
- Subtitle: "Forming hypotheses with confidence scores"
- List of 4 hypothesis cards, each card:
  - Top row: `H1` monospace tag (10px, gray) + label (13px, bold) + `ChevronDown` toggle
  - Middle: impact (12px mute)
  - Bottom: "Confidence" label + horizontal progress bar (h-1.5, rounded-full) + percentage (mono 11px, right)
  - Progress bar color: purple for normal, blue for linked hypotheses
  - Expandable: click card → slide down details section with 11px gray text

The 4 hypotheses:

```
H1 - Cash gap in 30 days
    Impact: £8,200 shortfall
    Confidence: 85%
    Detail: Projected cash drops below £4,000 safety threshold on day 18. 
            Driven by 3 large bills due before major receivable clears.
    Related: H2

H2 - Customer ABC dormant
    Impact: £12,400 at risk
    Confidence: 72%
    Detail: Top 15% customer, average order every 42 days, now 91 days silent. 
            Historical pattern suggests 60% churn probability past day 90.
    Related: H1

H3 - Supplier DEF early-pay discount
    Impact: £340 net gain
    Confidence: 68%
    Detail: 2/10 net 30 terms detected. Net benefit positive but cash cost 
            trade-off unfavourable while H1 is active.

H4 - Product line X margin drop
    Impact: Unclear
    Confidence: 41%
    Detail: Gross margin down 6.2% over 3 months. Insufficient signal - could 
            be seasonal or pricing pressure. Watch, do not act yet.
```

Animation: cards appear one at a time with 400ms delay each. When a card appears, the confidence bar animates from 0% to target over 800ms.

**Cross-hypothesis link effect (critical for demo)**:
When H2 appears, after 400ms both H1 and H2 cards get:
- Border color changes to state-blue
- Small blue link icon appears between them (or dashed line connecting)
- A reasoning banner appears below the whole 3-column grid (see 1.3)

**Column 3: Decide**
- Header: `Target` icon + "Decide" + status pill ("planning" / "done, 4 actions")
- Subtitle: "Planning ordered action set"
- List of 4 action cards, each card:
  - Top row: order number in a circle (18px) + label (13px bold) + status badge on right
  - Middle: reason (11px mute, line-height 1.5)
  - Bottom: permission indicator (small icon + text 10px mono)

Status badges (colored pill, 10px, uppercase, 2px 8px padding):
- IMMEDIATE (red bg, red text)
- IN PARALLEL (amber bg, amber text)
- NEXT WEEK (gray bg, dark gray text)
- WATCH ONLY (blue bg, blue text)

Permission indicators:
- "Auto-generated" with `Bot` icon in green
- "Needs approval" with `UserCheck` icon in amber

The 4 actions:

```
1. Draft collection email to XYZ Ltd  [IMMEDIATE]
   Reason: H1 shows 18-day cash gap; XYZ £8,000 invoice closes it. 
           Tone tuned to their strong payment history.
   Auto-generated

2. Reactivate customer ABC  [IN PARALLEL]
   Reason: H2 recovery cushions H1 downside. Personalized offer built 
           from last 4 orders.
   Needs approval

3. Defer supplier DEF early payment  [NEXT WEEK]
   Reason: H3 profitable but cash-negative right now. Revisit once H1 clears.
   Auto-scheduled

4. Monitor product line X  [WATCH ONLY]
   Reason: H4 confidence too low to act. Weekly margin check queued.
   Auto-generated
```

Animation: cards appear one at a time with 500ms delay.

### 1.3 Reasoning banner

Between the 3-column grid and any elements below it. Full width, appears/disappears based on step.

Style: state-blue/bg background, 3px left border in state-blue, 12px padding, rounded on right side only (border-radius 0 8px 8px 0). Icon `Sparkles` in state-blue. Text 12px in state-blue color, italic.

Three reasoning messages appear at specific moments:

1. After H2 appears (in Orient): "Cross-hypothesis link found: H2 reactivation could offset H1 cash gap. Marking as related."

2. After H3 appears (in Orient): "H3 profitable in isolation, but cash cost conflicts with H1. Priority downgraded."

3. After action #2 appears (in Decide): "Action 2 kept high-priority despite lower urgency — expected payoff cushions Action 1."

Each stays visible 2 seconds, then fades out over 400ms before the next appears.

### 1.4 Summary panel (appears after Act/Learn)

Card below the 3-column grid, appears with fade+slide when Learn step activates.

Header: `Zap` icon + "Act & Learn — summary" (14px bold)

Row of 3 stat cards inside:
- Cash risk defended: £8,000 (24px mono, green)
- Revenue identified: £12,400 (24px mono, purple)  
- Human approvals needed: 1 (24px mono, amber)

Below stats: action log list, 4 items:

```
09:15  📧 Collection email drafted for XYZ Ltd     £8,000
09:15  🎯 Reactivation offer generated for ABC     £12,400
09:16  ⏰ Supplier DEF payment deferred to Jul 11  £340
09:16  👁 Product X margin added to watchlist      monitor
```

Format: time (mono 10px gray) + emoji + label (12px) + right-aligned value (11px mono).

Bottom: memory update note in italic 11px: "Memory updated: XYZ payment reliability logged. ABC dormancy pattern flagged. Will re-evaluate in next cycle."

### 1.5 Deep-dive buttons row

Row of 3 buttons at bottom of tab, outline style:
- `Mail` "See collection email" → opens Dialog with email preview (see 1.6)
- `UserStar` "See reactivation email" → opens Dialog
- `Calculator` "How was confidence computed?" → opens Dialog with formula breakdown

### 1.6 Email preview dialogs

Dialog width 640px, showing a mock email with:
- From: agent@cashflow.ai
- To: [customer email]
- Subject: [subject line]
- Body: [mock email body]
- Bottom actions: "Send", "Edit", "Cancel"

**Collection email to XYZ Ltd** (tone: firm but professional, because XYZ has good history):
```
Subject: Friendly reminder — Invoice INV-2847 due July 15

Hi James,

I hope this note finds you well. Just a quick reminder that invoice 
INV-2847 for £8,000 is due next Tuesday, July 15.

We've always appreciated your prompt payments, and we know things can 
get busy. If there's anything holding up processing on your end, do 
let us know and we'll help sort it.

Payment link: [Pay now]

Warm regards,
Finance team
Demo Company Ltd
```

**Reactivation email to ABC** (tone: warm, personalized, includes offer):
```
Subject: We've missed you — a small thank-you inside

Hi Sarah,

It's been about 3 months since your last order, and honestly, we noticed 
because you're one of our favourite customers to work with.

Looking back at your last few orders, you seemed to love our premium 
ribbon series — we've just added two new colours that might be right up 
your street.

As a thank-you for being with us, here's 12% off your next order using 
code WELCOME-BACK-ABC (valid until August 15).

Would love to have you back.

Rachel
Demo Company Ltd
```

**Confidence math dialog** — shows formula and inputs:
```
H1 confidence: 85%

Formula:
  confidence = w1 × trend_strength 
             + w2 × data_completeness  
             + w3 × historical_accuracy

Inputs:
  trend_strength     = 0.92  (strong downward slope in cash projection)
  data_completeness  = 0.88  (all 6 data sources fresh, <24h old)
  historical_accuracy = 0.78 (similar predictions correct 78% of time)

Weights: w1=0.5, w2=0.2, w3=0.3

Result: 0.5×0.92 + 0.2×0.88 + 0.3×0.78 = 0.85 → 85%
```

### 1.7 Animation orchestration

When tab loads OR "Restart" button clicked, run this sequence:

```
t=0.0s   Observe becomes active, first data source appears
t=0.6s   All 6 sources shown, spinners running
t=1.5s   Spinners convert to values one by one (150ms stagger)
t=2.5s   Observe marked done, Orient becomes active
t=3.0s   H1 card appears with confidence animation
t=4.0s   H2 card appears
t=4.5s   H1/H2 turn blue, first reasoning banner appears
t=6.5s   Reasoning banner fades, H3 card appears
t=7.0s   Second reasoning banner appears
t=9.0s   Reasoning banner fades, H4 card appears
t=10.0s  Orient marked done, Decide becomes active
t=10.5s  Action 1 appears
t=11.5s  Action 2 appears, third reasoning banner
t=13.5s  Reasoning fades, Action 3 appears
t=14.5s  Action 4 appears
t=15.5s  Decide marked done, Act becomes active
t=16.0s  Summary panel slides in from bottom
t=16.5s  Stat numbers count up (using CountUp animation, 800ms)
t=17.5s  Action log items fade in one by one
t=19.0s  Learn becomes active, memory note appears
```

Speed multiplier (1x/2x/4x) divides all delays.

---

## TAB 2: Dashboard

### 2.1 Cash flow forecast chart

Full width Card, header "Cash flow — next 90 days" + subtitle "Predicted with 80% confidence interval".

Recharts ComposedChart, height 320px:
- X axis: dates from today to +90 days, ticks every 15 days
- Y axis: £ values, format with £ prefix and k suffix (£12k, £8k)
- Main line: solid line for actual (past 30 days) + dashed line for predicted (next 90 days), color state-purple
- Confidence band: shaded area between upper/lower bounds, state-purple with 15% opacity
- Reference line: horizontal dashed line at £4,000 labeled "Safety threshold" in state-red
- Annotation: red dot at day where line crosses threshold, with tooltip "Day 18 — cash gap projected"

Mock data — generate 120 points (30 past + 90 future). Past starts at £22,000 and drifts down to £12,540 today. Future continues downward, crosses £4,000 around day 18, bottoms at £-1,200 around day 35, then recovers to £6,000 by day 90. Confidence band widens over time (±£500 at day 0, ±£3,000 at day 90).

### 2.2 Opportunities & risks matrix

Card below, header "Opportunities & risks matrix".

2×2 quadrant chart using Recharts ScatterChart, height 340px:
- X axis: "Urgency" (0-100), no ticks shown, just "Low" and "High" labels at ends
- Y axis: "Financial impact (£)" (0-15000)
- Background: divide into 4 quadrants with subtle background colors:
  - Top-right: state-red/bg 30% (Act now)
  - Top-left: state-amber/bg 30% (Strategic plays)
  - Bottom-right: state-green/bg 30% (Quick wins)
  - Bottom-left: state-blue/bg 30% (Monitor)
- Quadrant labels in corners (12px, muted, uppercase)

Data points (dot size = impact, color = quadrant):
```
{ id: 'H1', label: 'XYZ collection', x: 92, y: 8000, quadrant: 'red' }
{ id: 'H2', label: 'ABC reactivation', x: 55, y: 12400, quadrant: 'amber' }
{ id: 'H3', label: 'DEF early pay', x: 78, y: 340, quadrant: 'green' }
{ id: 'H4', label: 'Product X watch', x: 25, y: 2000, quadrant: 'blue' }
```

Each dot 12-24px radius (scale by impact). Hover shows tooltip with label + impact + urgency + recommended action.

### 2.3 Customer & supplier risk lists

Two Cards side by side (grid-cols-2, gap 16px):

**Left: "Top receivables risk"**
Table with columns: Customer / Amount / Days overdue / Reliability score / Action

5 rows:
```
XYZ Ltd          £8,000    2 days early    92/100  [Send reminder]
Bright Fabrics   £3,200    0 days          85/100  [Watch]
Vintage Textiles £1,800    5 days overdue  62/100  [Send follow-up]
Alpha Design     £950      12 days overdue 41/100  [Escalate]
Sunset Studios   £4,500    on time         88/100  [Watch]
```

Reliability score shown as small horizontal bar (bar color by score: green ≥80, amber 50-79, red <50).
Action column is a small ghost button.

**Right: "Top payables optimization"**
Table with columns: Supplier / Amount / Terms / Discount opportunity / Action

5 rows:
```
Silk Wholesale UK  £4,200   Net 30    2/10 discount (£84)   [Pay early]
Fabric Direct      £2,800   Net 45    None                   [Standard]
DEF Suppliers      £1,700   2/10 net30 £34 gain              [Deferred]
London Threads     £3,900   Net 30    None                   [Standard]
Metro Packaging    £890     COD       None                   [Paid]
```

Action buttons small, ghost style, colored by action type.

---

## TAB 3: Actions Timeline

Timeline view of everything the agent has done and plans to do.

Layout: vertical timeline with a left-side rail (2px line in state-purple).
Each event is a card on the right side of the rail, with a dot on the rail.

Group events by day, with day headers (14px bold, sticky):

```
Today — Thursday, July 4
Tomorrow — Friday, July 5
Next week
```

Each event card:
- Left: circular dot on rail (16px, color by event type)
- Time (mono 11px gray)
- Icon + Title (13px bold)
- Description (12px mute, 2 lines max)
- Right side: status badge

Event types and colors:
- Auto-completed: green dot, `CheckCircle2` icon
- Awaiting approval: amber dot, `Clock` icon, has approve/reject buttons
- Scheduled: gray dot, `Calendar` icon
- Watching: blue dot, `Eye` icon

Mock events (12 total):

**Today**
```
09:15  ✅ Collection email sent to XYZ Ltd
       Personalized reminder for £8,000 invoice INV-2847
       [Auto-completed]

09:15  ⏳ Reactivation offer ready for ABC — awaiting approval
       12% discount code generated, personalized subject line, offer expires Aug 15
       [Approve] [Edit] [Reject]

09:16  📅 Deferred payment to Silk Wholesale UK
       Rescheduled from Jul 5 to Jul 11 to preserve cash runway
       [Auto-scheduled]

09:16  👁 Added Product Line X to weekly watchlist
       Margin dropped 6.2% over 3mo — will re-check every Monday
       [Watching]

11:30  ⚠ New hypothesis: possible seasonal dip approaching
       Historical Aug revenue drops 22% — draft mitigation plan?
       [Draft plan] [Dismiss]

14:20  ✅ Updated ABC reliability score
       Adjusted from 78 → 62 after dormancy detection
       [Auto-completed]
```

**Tomorrow**
```
09:00  📅 Scheduled: send follow-up to Vintage Textiles
       Second reminder for overdue invoice, £1,800
       [Cancel] [Edit]

10:00  📅 Scheduled: weekly cash health report
       Auto-generated summary emailed to owner
       [Cancel]
```

**Next week**
```
Jul 8   ⏳ Review: sunset promotion campaign
        Reactivation offer for 3 more dormant customers
        [Preview]

Jul 11  📅 Execute deferred supplier payment (DEF)
        £1,700 to DEF Suppliers, saving £34 discount lost
        [Cancel] [Reschedule]

Jul 14  ⏳ Review: pricing analysis for Product Line X
        4-week margin data ready for decision
        [Preview]

Jul 15  📅 XYZ Ltd invoice due
        £8,000 expected — will auto-verify on receipt
        [Watching]
```

Filter chips at top: All / Auto / Needs approval / Scheduled / Watching. Selecting a chip filters the list.

Search bar top-right: filters by text.

---

## Global Behaviors

### Sticky notifications

Toast notifications (shadcn Toast) fire during Agent Thinking animation:
- At t=6.5s: toast "Found revenue opportunity: £12,400" (purple, 3s duration)
- At t=15.5s: toast "1 action needs your approval" (amber, 3s)

### Empty states

If a user clicks Restart during animation, cleanly reset everything to empty state, wait 500ms, then re-run.

### Responsive

Above 1024px: full 3-column thinking panel.
768-1024px: thinking panel becomes single scrollable column, other tabs adapt to 1-column.
Mobile: not required for demo but degrade gracefully — stack everything vertically.

### Accessibility

- All buttons need aria-labels
- All charts need aria-label describing what they show
- Animation respects prefers-reduced-motion (skip to end states if reduced)

---

## What NOT to build

- No real API calls, no fetch, no backend, no auth
- No user login, no settings persistence  
- No dark mode toggle (light mode only)
- No routing / multiple pages
- No form submissions
- No real email sending — buttons should just show a toast "Email sent (demo)"

## Mock data source

Put all mock data in a single file `src/data/mockData.ts` with typed exports:

```typescript
export const kpiData = { ... }
export const dataSources = [ ... ]
export const hypotheses = [ ... ]
export const actions = [ ... ]
export const reasoningMessages = [ ... ]
export const cashFlowForecast = [ ... ]
export const opportunitiesMatrix = [ ... ]
export const receivables = [ ... ]
export const payables = [ ... ]
export const timelineEvents = [ ... ]
```

## Priority order

If build time is limited, build in this order:
1. Top bar + Hero KPI strip (fast, high visual impact)
2. Tab 1: OODA stepper + 3-column thinking panel with animations (this is the core demo)
3. Tab 1: reasoning banner + summary panel
4. Tab 2: cash flow chart + matrix
5. Tab 3: timeline
6. Email preview dialogs
7. Everything else

## Final polish

- Use subtle spring animations (framer-motion default spring) for card appearances
- Numbers should count up smoothly using CountUp
- Progress bars use ease-out cubic curve, 800ms duration
- Hover states on all interactive elements: border darkens, subtle background tint
- Focus rings on all buttons: 2px offset, state-purple

Build this as a polished demo. The visual quality of the Agent Thinking tab is what determines whether the demo succeeds — put the most effort there.
