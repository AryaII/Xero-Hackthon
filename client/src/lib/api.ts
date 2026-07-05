import type { HealthResponse, ProposedAction } from "./types";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  return res.json();
}

export async function startRun(): Promise<{ runId: string }> {
  const res = await fetch("/api/run", { method: "POST" });
  return res.json();
}

export function streamUrl(runId: string): string {
  return `/api/stream?runId=${runId}`;
}

export async function approveAction(id: string): Promise<{ action: ProposedAction }> {
  const res = await fetch(`/api/actions/${id}/approve`, { method: "POST" });
  return res.json();
}

export async function rejectAction(id: string): Promise<{ action: ProposedAction }> {
  const res = await fetch(`/api/actions/${id}/reject`, { method: "POST" });
  return res.json();
}
