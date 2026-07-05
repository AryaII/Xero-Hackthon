# Slide deck prompt — CashFlow Growth Agent (4 slides, judging-criteria aligned)

Paste this into a slide generator (Gamma, Beautiful.ai, PowerPoint Designer) or build
manually. Xero brand colors: primary `#13B5EA` (Xero blue), ink `#1B2733`, cool grey
background `#F4F5F7`, white cards, Inter font. Clean and product-like — this is a
real, working tool, not a mockup. Four slides only: one for the pitch, three mapped
directly to the judging rubric.

---

**Slide 1 — The idea**
- Headline: "CashFlow Growth Agent"
- Subhead: "An autonomous agent that runs the OODA loop — Observe, Orient, Decide,
  Act, Learn — on real Xero data, and drafts the fix for a human to approve."
- Three-line framing, stacked:
  - "Small businesses lose money quietly — a dormant customer, a late payment,
    nobody checks Xero daily."
  - "This agent watches continuously, finds the risk with transparent evidence,
    and drafts the real action — a human just clicks approve."
  - "Every number on the next three slides is live, not simulated."
- Visual: the five-step flow diagram (Observe → Orient → Decide → Act → Learn) as
  the centerpiece; logo mark top-left
- Caption bottom: "Works with Xero" (not an official Xero product)

**Slide 2 — Xero Connection: a real problem, real Xero data**
- Headline: "Not a mockup — a live Xero Demo Company, end to end"
- Left column, "The real problem":
  - Dormant high-value customers go unnoticed for months
  - Late-paying customers erode cash flow before anyone checks
  - Xero has the data; nobody has time to mine it daily
- Right column, "What's actually connected":
  - Real Xero Demo Company (UK), connected via the official Xero MCP Server —
    org name, invoices, contacts, balances all pulled live, not fixtures
  - Two detectors run against 87 real invoices: dormant-customer (correctly
    returns zero — verified true negative) and late-payment risk (3 real flags,
    £1,961 combined impact)
  - Real bank balance pulled live: £924, matched against the actual Xero UI
- Bottom line: "Every insight traces back to a real invoice, a real contact, a
  real balance — not a script."

**Slide 3 — API integration: effective, correct use of the Accounting API**
- Headline: "We tested the API before we trusted it"
- Left column, "What we integrate":
  - Reads: Invoices, Contacts, Accounts, BankTransactions, Organisation, and
    three Reports (Profit & Loss, Aged Receivables, Balance Sheet)
  - Writes: Quotes — every approved action creates a real **DRAFT** quote in
    Xero, with the real deep link returned and verified live
  - Payment-pattern intelligence (DSO, aging, payment lag) computed from real
    paid-invoice history — not the Payments API directly, deliberately, to
    keep every write side-effect-free until a human approves it
- Right column, "Correctness, not assumptions":
  - Verified live before coding: Xero's list endpoints return formatted text,
    not JSON; the P&L report hard-caps at 11 periods; quote-creation has no
    idempotency-key field at all
  - Found and fixed a real scope-configuration bug ourselves — a balance that
    looked "permanently unavailable" was actually one `.env` variable away
  - Every discrepancy is written up in a running engineering log, not
    papered over
- Bottom line: "Real API quirks, found and handled — not guessed at."

**Slide 4 — Structure: reliable, production-minded design**
- Headline: "Built like it has to survive a demo, not just a screenshot"
- Four guardrail bullets (icons, Xero blue):
  - Every write is DRAFT only — never authorised, never a payment, ever
  - Every action requires human approval — nothing auto-executes
  - Application-level duplicate-submission guard, since Xero's own write API
    has no idempotency key to lean on
  - No Xero secret ever reaches the browser — one backend module owns all
    Xero access
- Architecture strip: React (SSE) → Fastify backend (Observe/Orient/Decide/Act)
  → official Xero MCP Server → Xero Accounting API
- Reliability line: "DEMO_MODE replays real captured data offline — the demo
  never depends on live network access or rate limits, and every fixture came
  from this same real org."
- Close: "Real data in. Real drafts out. A human always stays in control."
