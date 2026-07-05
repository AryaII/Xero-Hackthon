import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { xero } from "./xero/mcpClient.js";
import { runObserve } from "./observe.js";
import { runOrient } from "./orient.js";
import { runDecide } from "./decide.js";
import { executeAction } from "./act.js";
import type { OodaEvent, ProposedAction } from "./events.js";

const actions = new Map<string, ProposedAction>();
// create-quote's tool schema has no idempotency-key field (NOTES.md §5c), so
// duplicate-submission protection happens here at the application layer instead.
const approvalsInFlight = new Set<string>();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), quiet: true });

interface Subscriber {
  send: (event: OodaEvent) => void;
  end: () => void;
}

interface Run {
  events: OodaEvent[];
  finished: boolean;
  subscribers: Set<Subscriber>;
}

const runs = new Map<string, Run>();

function createRun(): { runId: string; run: Run } {
  const runId = crypto.randomUUID();
  const run: Run = { events: [], finished: false, subscribers: new Set() };
  runs.set(runId, run);
  return { runId, run };
}

function emitTo(run: Run, event: OodaEvent): void {
  run.events.push(event);
  for (const subscriber of run.subscribers) subscriber.send(event);
}

// Act/Learn don't emit events yet (see build order §7.6+), so a run
// currently ends after Decide's "done" event. Close every open SSE
// connection once the run promise settles, otherwise EventSource clients hang
// waiting for a completion signal that never arrives.
function finishRun(run: Run): void {
  run.finished = true;
  for (const subscriber of run.subscribers) subscriber.end();
  run.subscribers.clear();
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/api/health", async () => {
  const demoMode = process.env.DEMO_MODE === "true";
  try {
    const org = await xero.organisation();
    return { xeroConnected: true, demoMode, org: org.name ?? null };
  } catch (err) {
    return { xeroConnected: false, demoMode, org: null, error: (err as Error).message };
  }
});

app.post("/api/run", async (_req, reply) => {
  const { runId, run } = createRun();
  (async () => {
    const observed = await runObserve((event) => emitTo(run, event));
    const hypotheses = await runOrient(observed.raw, (event) => emitTo(run, event));
    const proposed = await runDecide(hypotheses, (event) => emitTo(run, event));
    for (const action of proposed) actions.set(action.id, action);
  })()
    .catch((err) => {
      emitTo(run, { type: "toast", tone: "warn", text: `Run failed: ${(err as Error).message}` });
    })
    .finally(() => {
      finishRun(run);
    });
  return reply.send({ runId });
});

app.get("/api/stream", async (req, reply) => {
  const { runId } = req.query as { runId?: string };
  const run = runId ? runs.get(runId) : undefined;
  if (!run) {
    return reply.code(404).send({ error: "unknown runId" });
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event: OodaEvent) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  for (const event of run.events) send(event);
  if (run.finished) {
    reply.raw.end();
    return reply;
  }

  const subscriber: Subscriber = { send, end: () => reply.raw.end() };
  run.subscribers.add(subscriber);
  req.raw.on("close", () => {
    run.subscribers.delete(subscriber);
  });

  reply.hijack();
  return reply;
});

app.get("/api/actions", async () => [...actions.values()]);

app.post("/api/actions/:id/approve", async (req, reply) => {
  const { id } = req.params as { id: string };
  const action = actions.get(id);
  if (!action) return reply.code(404).send({ error: "unknown action" });
  if (action.status !== "proposed") return { action }; // already actioned — no-op, not a re-submit
  if (approvalsInFlight.has(id)) return reply.code(409).send({ error: "approval already in progress" });

  approvalsInFlight.add(id);
  try {
    const updated = await executeAction(action);
    actions.set(id, updated);
    return { action: updated };
  } finally {
    approvalsInFlight.delete(id);
  }
});

app.post("/api/actions/:id/reject", async (req, reply) => {
  const { id } = req.params as { id: string };
  const action = actions.get(id);
  if (!action) return reply.code(404).send({ error: "unknown action" });
  if (action.status !== "proposed") return { action };
  action.status = "rejected";
  action.actionedAt = new Date().toISOString();
  return { action };
});

const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: "0.0.0.0" });
