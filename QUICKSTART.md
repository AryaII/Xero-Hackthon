# Quick Start — human setup checklist

This app needs live Xero credentials before it can run. Work top to bottom; the whole
thing is ~20–30 min. The one step people get wrong is #2 — it must be a **Custom
Connection**, not a Web/PKCE app.

---

## ☐ Step 1 — Create a Xero Demo Company (~5 min)

- [ ] Sign up for a free Xero account at `xero.com` (or log into an existing one).
- [ ] Top-left org dropdown → select **Demo Company**. Set region to **United Kingdom**
      (suits a UK judging panel; UK/NZ also unlock payroll data if you want it later).
- [ ] Poke around: it ships with real sample invoices, contacts, and bank transactions —
      that's your live data. You can reset it anytime from *My Xero*.

## ☐ Step 2 — Create a Custom Connection app (~10 min) — **the step to get right**

- [ ] Go to `developer.xero.com` → **My Apps** → **New app**.
- [ ] Choose **Custom Connection** (machine-to-machine, single org).
      **NOT** "Web app" and **NOT** "Mobile or PKCE app" — those won't work with the MCP server.
- [ ] Connect it to your **Demo Company** organisation.
- [ ] Add these scopes (granular; add more later if a detector needs them — scopes are additive):
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
- [ ] Copy the **Client ID** and **Client Secret** (secret is shown once — save it now).

## ☐ Step 3 — Fill `.env` (~2 min)

- [ ] Copy `.env.example` → `.env` in the project root.
- [ ] Paste your Client ID / Secret and an LLM key. Confirm `.env` is git-ignored.
- [ ] Keep `DEMO_MODE=false` to hit real Xero.

## ☐ Step 4 — Run it

- [ ] `npm install` (project root) and `cd client && npm install`.
- [ ] `npm run dev` (backend, port 8787) and `cd client && npm run dev` (frontend, port 5173),
      in two terminals.
- [ ] At demo time, **you** click "Approve" on an action — it creates a real DRAFT in Xero.

---

## Verify setup is good before building

Hit `http://localhost:8787/api/health` — it should return `xeroConnected: true` and your
real Demo Company name. If it errors:

- **auth/scope error** — re-check Step 2 (wrong app type, or a missing scope).
- **"invalid_client"** — Client ID/Secret mismatch in `.env`.
- **empty/timeout** — the MCP server didn't spawn; check Node 20+ and that `npx` works.
- **A specific report call fails with a generic "unexpected error" message** — check
  `XERO_SCOPES` in `.env` before re-checking the Xero developer portal. `XERO_SCOPES`
  is what actually gets requested at token time; if your app has a scope granted but
  `XERO_SCOPES` doesn't list it, the call still fails, and the error text looks
  identical either way. Add the scope to `XERO_SCOPES`, restart the backend (the MCP
  client caches its connection per process), and retry.

> Never commit `.env`. Only `.env.example` (with empty values) belongs in git.
