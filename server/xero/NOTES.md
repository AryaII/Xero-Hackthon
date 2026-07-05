# Task 0 findings — real Xero MCP server vs. the build brief

Captured against the real Demo Company (UK), org id `9a6f90de-bf4d-4ed5-9690-e9492ec83be9`,
via `@xeroapi/xero-mcp-server@latest` over stdio. Fixtures live in `__fixtures__/`.

## 1. Every `list-*` tool returns formatted text, not JSON objects (biggest discrepancy)

The brief's §4.2/§4.3 assume `list-invoices`, `list-contacts`, `list-bank-transactions`,
`list-items`, `list-tracking-categories` return arrays of typed JSON records ready for
direct field access + `zod` validation.

**Reality:** every one of those tools returns an MCP `content` array of
`{ type: "text", text: "..." }` blocks — one leading "Found N X" block, then **one text
block per record**, each a human-readable `Key: Value\n` string (see e.g.
`__fixtures__/list-invoices.json`). There is no structured JSON for these tools at all.
We must write a line-based parser per entity type (`parsers.ts`) that splits on `\n`,
splits each line on the first `:`, and special-cases flag-only lines that have no colon
(e.g. `Unreconciled`, `AUTHORISED`, `No email`, `Does not have attachments`).

Only the two **report** tools (`list-profit-and-loss`,
`list-aged-receivables-by-contact`) embed real JSON — as a *string* inside one of the
text blocks (see §2).

## 2. Report tools embed a report-grid JSON string, exactly as warned

`list-profit-and-loss` and `list-aged-receivables-by-contact` return a few plain-text
preamble blocks (report name / date range) followed by one text block whose `.text` is
`JSON.stringify` of a grid:

```
[{ rowType: "Header", cells: [{ value: "31 Jul 26" }, ...] },
 { rowType: "Section", title: "Income", rows: [
     { rowType: "Row", cells: [{ value: "Sales", attributes: [{ id: "account", value: "<guid>" }] }, { value: "5039.80", attributes: [...] }, ...] },
     { rowType: "SummaryRow", cells: [{ value: "Total Income" }, { value: "5039.80" }, ...] }
   ]},
 ...]
```

Field-access path: cell **index N** in any data row lines up with column **index N** in
the `Header` row's `cells`. Account/invoice identity rides along as
`cell.attributes[].id === "account"` (P&L) or `"invoiceID"` (aged receivables), value is
the GUID. Must `JSON.parse()` that one text block's `.text` to get the grid — don't try
to regex the outer MCP text blocks.

Aged-receivables header columns: `Date, Number, Due Date, "", Total, Paid, Credited, Due`.

## 3. `list-profit-and-loss` caps `periods` at 11, not 12

The brief says "12mo trend" and Task 0's own script literally calls
`list-profit-and-loss(periods=12)`. That call **always** fails:

```
"Error listing profit and loss report: An unexpected error occurred while communicating with Xero."
```

`periods: 11` (and below) works every time. This matches Xero's real Reports API
constraint (`periods` is 1–11, additive to the base/current period). **Use
`periods: 11` for the "12-month" trend** — confirmed against the fixture, this
actually yields **13 header cells (1 blank label column + 12 period columns)**, i.e.
exactly the 12-month trend the brief wants. `periods: 12` is never valid — it always
throws `"An unexpected error occurred while communicating with Xero."` Don't pass 12.

## 4. Dates are locale-dependent `Date.toString()` strings, not ISO

Every date field in the text blocks looks like:

```
Date: Sun May 24 2026 01:00:00 GMT+0100 (英国夏令时间)
```

That's JS `Date.prototype.toString()` output — the parenthesized zone name is rendered
in whatever locale the *MCP server process* runs under (here, Chinese, because the host
OS locale is zh-CN), not a fixed value you can string-match. `new Date(theWholeString)`
parses it fine regardless of the trailing locale text (JS ignores the unparseable
suffix), so **parse with `new Date(...)`, then immediately convert to ISO/UTC and never
carry the raw string forward.** Report-grid dates are the friendlier
`2026-06-29T00:00:00` form — no locale issue there.

## 5. No running bank balance field anywhere in `list-bank-transactions`

The brief's Observe table maps "Bank balance" → `list-bank-transactions` → "running
balance". The tool only returns individual transaction records (id, bank account
name+id, contact, date, sub total, total, reconciled/AUTHORISED status, line items) —
there is no balance field. `list-accounts` (present in the real tool list, not named in
the brief) is the correct source for the account's actual current balance; treat
`list-bank-transactions` as transaction history for reconciliation/pattern detection
only, and pull `list-accounts` separately for the balance figure.

## 5b. RESOLVED — the missing-scope bug was in our own `.env`, not Xero

Originally reported as "no real bank balance obtainable with the current scopes" and
shipped as an honest gap. **That diagnosis was half wrong.** The Xero Custom
Connection app itself had the full scope list granted all along, including
`accounting.reports.balancesheet.read` and `accounting.reports.trialbalance.read`
(confirmed 2026-07-05 by the human pasting the app's actual authorized-scopes page).

The real bug: this project's own `.env` sets `XERO_SCOPES` as an **override**, and
that override listed only 7 scopes — it never included the balance-sheet/trial-balance
ones. Per the MCP server's own behavior (and the build brief §3.1), `XERO_SCOPES` is
what actually gets requested from Xero at token time, regardless of what the app is
authorized for. So the client-side override was silently self-limiting the token to a
narrower scope set than the app actually had — the server-side `"An unexpected error
occurred while communicating with Xero"` for `list-trial-balance` /
`list-report-balance-sheet` was consistent with a missing scope, just not the scope
gap we thought it was.

**Fix:** added `accounting.reports.balancesheet.read`, `accounting.reports.trialbalance.read`,
and `accounting.reports.banksummary.read` to `XERO_SCOPES` in `.env`, restarted the
backend (the MCP client caches its connection per process, so a fresh process is
required to request a new token), and re-tested — both tools now succeed.

**Real balance confirmed:** `list-report-balance-sheet`'s "Bank" section for this org
returns `Business Bank Account: 924.25` (as of 5 Jul 2026) — a real number, not a
transaction-activity proxy. Also note: `list-bank-transactions` still has no
`Type` (RECEIVE/SPEND) field, so it remains unsuitable for computing a balance by
summation — the balance sheet is the correct source, not bank transactions.

**Lesson:** when a report call fails with a generic Xero error, check this project's
own `XERO_SCOPES` override in `.env` before concluding the Custom Connection app is
missing a scope — the two are easy to conflate and only one of them is fixable by
editing a local file.

## 5c. `create-quote` DOES return a real deep link — no need to construct one

§6b of the brief warns the "View in Xero" link might not come back from a write
and may need constructing manually. Tested live against a real contact (Basket
Shop) with a throwaway £1 line item: the response text is

```
Quote created successfully:
ID: ff328c05-70b9-4f34-a782-d315b304934f
Contact: Basket Shop
Total: 1.2
Status: DRAFT
Link to view: https://go.xero.com/app/!x59FT/quotes/view/ff328c05-70b9-4f34-a782-d315b304934f
```

`Status: DRAFT` confirmed (never AUTHORISED). Parse `ID` and `Link to view` directly
from this text — don't build the `go.xero.com` URL by hand. Also: `create-quote`'s
input schema has **no idempotency-key field at all** — the brief's §6 idempotency
guidance assumes one exists to pass through. There's nothing to pass it as, so
duplicate-submission protection has to happen at the application layer (disable the
approve action for that id after first click) rather than via a Xero-level key.

## 6. Tool inventory: 51 tools, not ~13

`tools/list` returned 51 tools (saved in `__fixtures__/_tools-list.json`). All 6 read
tools and the write tools (`create-quote`, `create-invoice`, `create-contact`,
`create-credit-note`) the brief names exist **verbatim** — good, no renames to worry
about. The server also exposes a large payroll/timesheet surface
(`list-payroll-employees`, `*-timesheet`, leave balances/types/periods),
`list-accounts`, `list-quotes`, `list-credit-notes`, `list-payments`,
`list-manual-journals`, `list-trial-balance`, `list-report-balance-sheet`,
`list-tax-rates`, `list-contact-groups`, and `update-*` variants for most entities —
none of that is needed for the brief's detectors but it's available if a future
detector wants it.

## 7. Org confirms real, live Demo Company

`list-organisation-details` → `Name: Demo Company (UK)`, `Is Demo Company: Yes`,
`Organisation Status: ACTIVE`, base currency GBP, country GB. `Created Date` on the org
shows it was (re)provisioned very recently relative to today, yet ships with a full
~12 months of pre-populated historical invoices/transactions (P&L data runs Aug 2025 →
Jul 2026) — that's Xero's demo-data template working as intended, not a stale
connection.

## 8. Housekeeping (non-blocking, fixed during Task 0)

- `.env` had two **inline `#` comments** on value lines (`LLM_PROVIDER=anthropic #
  anthropic | openai` and `DEMO_MODE=false  # true = ...`). `dotenv` does not strip
  inline comments — both values would have carried the comment text as part of the
  literal string. Fixed by moving comments to their own line above. **Lesson: never put
  a `#` comment after a value on the same line in this `.env`.**
- The installed `dotenv` (v17.4.2, official package) prints a rotating self-promo "tip"
  line on every `.config()` call (mentions `dotenvx.com` / `vestauth.com` — legitimate,
  same maintainer, not a supply-chain issue, just noisy). Pass `{ quiet: true }` to
  `dotenv.config()` in the real server so it doesn't pollute logs/SSE output.

## Net effect on §4 backend design

- `server/xero/parsers.ts` needs one line-based key/value parser per entity
  (invoice, contact, bank transaction, item, tracking category) plus one report-grid
  JSON parser shared by P&L and aged-receivables. None of this is optional — without it
  there is no structured data to feed Observe/Orient at all.
- Every parsed date must be normalized to ISO immediately; never pass the raw
  `Date.toString()` string past the parser boundary.
- Cap any `list-profit-and-loss` call at `periods: 11`.
- Pull `list-accounts` for bank balance; use `list-bank-transactions` for
  history/pattern detection only.
