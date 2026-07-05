import type { CreateQuotePayload, CreateQuoteResult } from "./xero/types.js";

export interface HypothesisEvidence {
  source: string;
  value: string;
}

export interface ConfidenceFormula {
  formula: string;
  inputs: Record<string, number>;
  weights: Record<string, number>;
}

export interface Hypothesis {
  id: string;
  kind: "dormant_customer" | "late_payment_risk";
  label: string;
  detail: string;
  impactGBP: number | null;
  confidence: number; // 0..1
  relatedIds: string[];
  evidence: HypothesisEvidence[];
  confidenceFormula: ConfidenceFormula;
  subjectContactId?: string; // present for dormant_customer — needed to draft a real quote
}

export interface ProposedAction {
  id: string;
  hypothesisId: string;
  title: string;
  reason: string;
  kind: "draft_quote" | "draft_followup";
  permission: "needs_approval";
  status: "proposed" | "approved" | "rejected" | "failed";
  payload?: CreateQuotePayload; // only draft_quote actions have one
  xeroResult?: CreateQuoteResult; // filled in after a successful real write
  error?: string;
  actionedAt?: string; // ISO timestamp set when status leaves "proposed"
}

export type OodaEvent =
  | { type: "step"; step: "observe" | "orient" | "decide" | "act" | "learn"; state: "active" | "done" }
  | { type: "source"; id: string; label: string; value?: unknown; state: "loading" | "done" | "error"; error?: string }
  | { type: "hypothesis"; hypothesis: Hypothesis }
  | { type: "action"; action: ProposedAction }
  | { type: "toast"; tone: "info" | "warn"; text: string };
