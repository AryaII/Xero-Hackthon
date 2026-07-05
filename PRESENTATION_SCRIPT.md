# Presentation script — CashFlow Growth Agent

Target length: ~4–5 minutes including a live demo. Cues in **[bold brackets]** tell
you when to advance a slide or switch to the browser. Speak conversationally — this
is written to be said out loud, not read verbatim.

---

**[Slide 1 — Title]** *(15 sec)*

"Hi, we're presenting CashFlow Growth Agent — an autonomous agent that finds revenue
opportunities in real Xero data, and drafts the fix for a human to approve. It's
built on the official Xero MCP Server, connected right now to a real Xero Demo
Company."

**[Slide 2 — The problem]** *(20 sec)*

"Here's the problem we're solving. Small businesses lose money quietly. A
high-value customer goes dormant and nobody notices for months. An invoice is
predicted to pay late and by the time someone checks, the cash gap has already
hit. Xero has all this data — but nobody has time to mine it every single day."

**[Slide 3 — What we built]** *(30 sec)*

"So we built an agent that runs the OODA loop — Observe, Orient, Decide, Act,
Learn — directly on live Xero data. It observes six real data sources in
parallel. It orients using two detectors — dormant high-value customers, and
predicted late payments — each with a transparent, math-you-can-check confidence
score, not a black-box LLM guess. It decides by turning every finding into a
human approval queue. It acts by creating a real DRAFT object in Xero the moment
someone clicks approve. And it learns by summarizing what actually happened.
Nothing here is scripted — every number you're about to see is live."

**[Slide 4 / switch to browser]** *(60–90 sec)*

"Let's watch it think." *(Open the app, click Restart if needed)*

"This is pulling from our real Xero Demo Company right now — watch the Observe
column populate: bank accounts, aged receivables, aged payables, P&L, contact
history, payment patterns — six real sources, live.

Now Orient — it's found three real late-payment risk hypotheses. Basket Shop,
City Limousines, Marine Systems — each one backed by real invoice numbers, real
amounts, and a confidence score I can click open and see the exact formula
behind. No hand-waving.

Decide turns those into an approval queue. And here's the moment that matters —"
*(click Approve on one)* "— that just created a real DRAFT quote in Xero. Here's
the deep link — I can open it and show you it's actually sitting there, in
DRAFT status, waiting for a human. Nothing gets sent, nothing gets authorised,
until someone chooses to."

**[Slide 5 — What makes this real]** *(30 sec)*

"A quick word on rigor, because this matters for judging: we didn't build against
assumed API shapes. We tested the live MCP server first — and found real
surprises. Xero's list endpoints return formatted text, not JSON. The P&L report
caps at 11 periods, not 12. There's no idempotency key on writes, so we built our
own duplicate-submission guard. Every one of these is documented, and every gap
we couldn't close — like a live bank balance, which needs a scope we don't have
— is labeled honestly in the UI instead of faked."

**[Slide 6 — Safety by design]** *(20 sec)*

"And it's safe by construction: every write is DRAFT only — never authorised,
never a payment. Every action needs a human click. No email is ever auto-sent.
No Xero secret ever touches the browser."

**[Slide 7 — Architecture]** *(15 sec)*

"Under the hood it's a straightforward stack — React frontend streaming live over
SSE, a Fastify backend running the OODA pipeline, talking to Xero exclusively
through the official MCP server."

**[Slide 8 — Close]** *(15 sec)*

"Real data in. Real drafts out. A human always stays in control. That's the
loop — insight to measurable action, on real Xero data. Thank you."

---

### If you get a follow-up question

- **"Why no dormant-customer example live?"** — "Because the detector's honest —
  this Demo Company's top customers are all actively ordering right now. We
  verified that's a true negative, not a bug, and we still exercised the
  quote-write code path directly against a real contact to prove it works."
- **"What about the bank balance?"** — "The MCP server's trial-balance and
  balance-sheet report tools need a scope our Custom Connection doesn't have
  yet. Rather than fake a number, the UI says so."
- **"Is this production-ready?"** — "The safety model is: draft-only writes,
  human approval, no auto-send. That's deliberately conservative for a
  hackathon timeline — the next real step would be adding the missing report
  scopes and a broader detector set."
