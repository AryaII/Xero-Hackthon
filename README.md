# CashFlow Growth Agent

An autonomous **OODA-loop agent** (Observe → Orient → Decide → Act → Learn) that connects to a real Xero organisation via the official **Xero MCP Server**, finds revenue-protecting opportunities in real invoice/payment data, and drafts real Xero objects for a human to approve — never sending, authorising, or moving money on its own.

Built for the ["Bring Your Own AI Agent"](#) Xero hackathon bounty: *actively identify and act on revenue opportunities using Xero data — data analysis + autonomous action, turning insights into measurable business outcomes.*

> **Works with Xero.** Not an official Xero product.

---

## What it actually does

1. **Observe** — pulls 6 real data sources from Xero in parallel (bank accounts, aged receivables, aged payables, 12-month P&L, contact history, payment patterns) and streams each one live over SSE as it resolves.
2. **Orient** — two deterministic detectors turn that data into hypotheses, each with real evidence and a transparent, inspectable confidence formula (no LLM, no black box):
   - **Dormant high-value customer** — top-15%-by-revenue contact gone silent past 2× their usual ordering rhythm
   - **Late-payment risk** — open invoices whose contact's historical payment lag projects past the due date
3. **Decide** — every hypothesis becomes a proposed action sitting in a human approval queue. Nothing executes without a click.
4. **Act** — approving a `draft_quote` action creates a **real DRAFT quote in Xero** (verified live, deep link included). Approving a `draft_followup` produces drafted text for a human to copy and send — Xero's MCP server doesn't send email, so the agent doesn't pretend to either.
5. **Learn** — a live summary (cash risk defended, revenue identified, approvals still pending) computed from what was actually approved or rejected, plus a timestamped action log.

Everything downstream of Observe is computed from the same real dataset — nothing in this app is scripted or faked, and every honest gap (see below) is labeled as such in the UI rather than papered over.

## Screenshots

*(Agent Thinking tab — live OODA trace on real Xero data, Dashboard, Actions Timeline)*

Add your own screenshots to a `docs/` folder and reference them here, e.g.:


![Dashboard](/p1.png)
![Dashboard](/p2.png)
![Dashboard](/p3.png)


## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND — React + Vite + TS + Tailwind (client/)               │
│   • Agent Thinking tab — live OODA trace via SSE                 │
│   • Dashboard — real cash-flow projection + risk tables          │
│   • Actions Timeline — approval queue                            │
└───────────────▲─────────────────────────────────────┬────────────┘
                │ GET /api/health, /api/stream         │ POST /api/run
                │                                       │ POST /api/actions/:id/approve|reject
┌───────────────┴─────────────────────────────────────▼────────────┐
│  BACKEND — Node + TypeScript + Fastify (server/)                  │
│   observe.ts → orient.ts → decide.ts → act.ts                     │
│   xero/mcpClient.ts — the only module that talks to Xero          │
└───────────────────────────────┬────────────────────────────────────┘
                                 │ MCP over stdio
                    ┌────────────▼────────────┐
                    │ @xeroapi/xero-mcp-server │
                    └────────────┬────────────┘
                                 │ OAuth2 (Custom Connection)
                          Xero Accounting API
```

## Tech stack

- **Backend:** Node 20+, TypeScript, Fastify, `@modelcontextprotocol/sdk` (MCP client)
- **Frontend:** React 19, Vite, Tailwind CSS v4, Recharts, Framer Motion, lucide-react
- **Xero integration:** [`@xeroapi/xero-mcp-server`](https://github.com/XeroAPI/xero-mcp-server) via the Model Context Protocol
- **Auth:** Xero Custom Connection (machine-to-machine, single org)

## Real vs. honest gaps

This project prioritizes **never fabricating a number**. Where the live API can't return something, the UI says so instead of guessing:

| Feature | Status |
|---|---|
| 6 Observe data sources | ✅ Real, live |
| Dormant-customer / late-payment detectors | ✅ Real, computed from live invoices |
| Draft quote creation in Xero | ✅ Real write, verified live, `DRAFT` status only |
| Approval queue (approve/reject) | ✅ Real, backed by the write above |
| Cash health score | ✅ Real formula (DSO, receivables/payables coverage, late-payment risk) |
| Available cash (absolute balance) | ✅ Real, from `list-report-balance-sheet`'s Bank section |
| 90-day cash flow chart | ✅ Real starting balance + scheduled receivables/payables, with the £4,000 safety-threshold line |
| Opportunities matrix | Rendered as a ranked table rather than a 2×2 scatter plot |

See [`server/xero/NOTES.md`](server/xero/NOTES.md) for the full list of real-world API discrepancies discovered while building this (report-grid shapes, a hard `periods` cap on P&L, locale-dependent date strings, no idempotency-key field on writes, etc.) — written up as they were found, against live data, not assumed from docs.

## Safety guardrails

- Every write is a **DRAFT**. Never `AUTHORISED`, never `create-payment`, never anything that moves money.
- Every action requires human approval — nothing executes automatically.
- No email is ever sent by the agent — Xero's MCP server can't send email, so "drafted follow-up" text is exactly that: text for a human to copy.
- No Xero secret ever reaches the browser bundle.

## Getting started

Full human setup checklist: see `QUICKSTART.md` (Xero Demo Company → Custom Connection app → scopes → `.env`).

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Configure
cp .env.example .env   # fill in XERO_CLIENT_ID / XERO_CLIENT_SECRET / ANTHROPIC_API_KEY

# 3. Run the backend (http://localhost:8787)
npm run dev

# 4. Run the frontend (http://localhost:5173), in a second terminal
cd client && npm run dev
```

Set `DEMO_MODE=true` in `.env` to run entirely offline against captured real-data fixtures (`server/xero/__fixtures__/`) — useful for demos where live API access or rate limits are a risk. Every fixture was captured from a real Xero Demo Company, not hand-written.

### Required Xero OAuth 2.0 scopes

```
accounting.reports.aged.read
accounting.reports.profitandloss.read
accounting.reports.balancesheet.read
accounting.reports.trialbalance.read
accounting.reports.banksummary.read
accounting.contacts.read
accounting.settings.read
accounting.banktransactions.read
accounting.invoices
accounting.invoices.read
```

> The scopes actually **requested** are whatever `XERO_SCOPES` in `.env` lists —
> it's an override, not just a filter on what the Xero app is authorized for. If a
> report call fails with a generic error, check this variable before assuming the
> Xero app itself is missing a scope (see `server/xero/NOTES.md` §5b — this exact
> mix-up cost real debugging time).

## Project structure

```
server/
  index.ts          Fastify app — health, run, SSE stream, approval endpoints
  observe.ts         6 real Observe data sources
  orient.ts          Dormant-customer + late-payment detectors
  decide.ts          Hypothesis → proposed action mapping
  act.ts             Executes approved actions (real Xero writes)
  xero/
    mcpClient.ts      The only module that talks to the Xero MCP server
    parsers.ts        Turns Xero's text/report responses into typed data
    types.ts          Shared Xero data types
    NOTES.md          Real API discrepancies found during development
    __fixtures__/     Captured real responses, reused for DEMO_MODE
client/
  src/
    components/       Xero-branded UI (Agent Thinking / Dashboard / Actions Timeline)
    hooks/useOodaRun.ts   SSE client + approval-queue state
    lib/               API client, cash-flow/health-score calculations
```
