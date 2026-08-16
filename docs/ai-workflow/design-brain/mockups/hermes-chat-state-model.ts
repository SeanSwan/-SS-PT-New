/**
 * Hermes Chat UI — block-list state model (SWA-160 · Slice 1)
 * ============================================================
 * Schema doc: hermes-chat-state-model.md (same directory) — read it first.
 *
 * A turn is NOT a message pair. It is an ordered, interleaved block list:
 * text → tool → tool → text → approval → text. This file is the contract
 * every later slice (replay harness, transport wiring) builds against.
 *
 * Standalone: no imports, compiles under `tsc --strict --noEmit`.
 */

// ── Identifiers ──────────────────────────────────────────────────────────

export type SessionId = string;
export type TurnId = string;
export type BlockId = string;
/** The gateway's tool_call_id (probed: emitted on tool.* events). */
export type ToolCallId = string;
/** The gateway's approval rid — `_pending[rid] = (sid, ev)` server-side. */
export type ApprovalRequestId = string;
/** Monotonic event cursor for replay/reconnect. Dedupe key when present. */
export type EventSeq = number;

// ── Blocks ───────────────────────────────────────────────────────────────

export interface TextBlock {
  type: 'text';
  id: BlockId;
  /** 'interim' = gateway message.interim (muted status text, upsert-in-place). */
  kind: 'prose' | 'interim';
  text: string;
  /** True only while this is the turn's open tail receiving message.delta.
   *  Invariant 4: at most one streaming text block per turn, always the tail. */
  streaming: boolean;
}

export type ToolStatus = 'running' | 'ok' | 'error' | 'canceled';

export interface ToolBlock {
  type: 'tool';
  id: BlockId;
  toolCallId: ToolCallId;
  name: string;
  /** One-line arg summary for the collapsed row (e.g. "npm install --workspace web"). */
  argsSummary: string;
  status: ToolStatus;
  /** Full output; null until tool.complete. Truncation is a Slice-5 render concern. */
  output: string | null;
  /** Verdict from tool.output_risk; null if none emitted. */
  outputRisk: string | null;
  durationMs: number | null;
}

export type ApprovalState = 'pending' | 'approved' | 'denied' | 'expired';

export interface ApprovalBlock {
  type: 'approval';
  id: BlockId;
  requestId: ApprovalRequestId;
  /** Approval class from the gateway event, e.g. 'shell' | 'file'. */
  kind: string;
  /** The literal command — the card must be self-contained (Mockup B rule). */
  command: string;
  description: string;
  state: ApprovalState;
  /** Queue label metadata from the event ("2 of 2") — display-only, never an index. */
  queueLabel: string | null;
  requestedAt: number;
  resolvedAt: number | null;
  resolvedBy: 'user' | 'policy' | 'smart_denied' | null;
}

export type Block = TextBlock | ToolBlock | ApprovalBlock;

// ── Turns & state ────────────────────────────────────────────────────────

export type Role = 'user' | 'assistant';
export type TurnStatus = 'streaming' | 'complete' | 'stopped' | 'error';

export interface Turn {
  id: TurnId;
  role: Role;
  status: TurnStatus;
  /** Append-only. Never reordered, never spliced (Invariant 5). */
  blocks: Block[];
  startedAt: number;
  endedAt: number | null;
}

export interface BlockRef {
  turnId: TurnId;
  blockId: BlockId;
}

export type ConnectionState = 'connecting' | 'open' | 'closed';

export interface ChatState {
  sessionId: SessionId | null;
  /** Append-only. */
  turns: Turn[];
  /** rid → location. O(1) out-of-order approval resolution (hard case 2). */
  approvalIndex: Record<ApprovalRequestId, BlockRef>;
  /** tool_call_id → location. Lets tool.complete land after later blocks exist. */
  toolIndex: Record<ToolCallId, BlockRef>;
  /** Replay cursor: highest event seq folded in (hard case 4). */
  lastEventSeq: EventSeq;
  connection: ConnectionState;
}

/**
 * Invariant 2: UI ephemera NEVER enter ChatState. Discarded on reload;
 * replay stays deterministic and expansion can't desync from data.
 */
export interface UiEphemera {
  expandedToolBlocks: ReadonlySet<BlockId>;
  composerDraft: string;
  sessionsRailOpen: boolean;
  activityRailOpen: boolean;
}

// ── Gateway events (discriminated union over probed event names) ─────────

interface EventBase {
  /** Present when the gateway numbers events; else dedupe by type + stable id. */
  seq?: EventSeq;
  sessionId: SessionId;
  turnId: TurnId;
  at: number;
}

export interface MessageStartEvent extends EventBase { type: 'message.start'; role: Role }
export interface MessageDeltaEvent extends EventBase { type: 'message.delta'; text: string }
export interface MessageInterimEvent extends EventBase { type: 'message.interim'; text: string }
export interface MessageCompleteEvent extends EventBase { type: 'message.complete' }

export interface ToolStartEvent extends EventBase {
  type: 'tool.start'; toolCallId: ToolCallId; name: string; argsSummary: string;
}
export interface ToolGeneratingEvent extends EventBase {
  type: 'tool.generating'; toolCallId: ToolCallId; argsSummary: string;
}
export interface ToolCompleteEvent extends EventBase {
  type: 'tool.complete'; toolCallId: ToolCallId; ok: boolean; output: string; durationMs: number;
}
export interface ToolOutputRiskEvent extends EventBase {
  type: 'tool.output_risk'; toolCallId: ToolCallId; risk: string;
}

export interface ApprovalRequestEvent extends EventBase {
  type: 'approval.request'; requestId: ApprovalRequestId; kind: string;
  command: string; description: string; queueLabel: string | null;
}
export interface ApprovalRespondEvent extends EventBase {
  type: 'approval.respond'; requestId: ApprovalRequestId;
  verdict: 'approved' | 'denied' | 'expired';
  resolvedBy: 'user' | 'policy' | 'smart_denied';
}

export interface TurnAbortEvent extends EventBase { type: 'turn.abort' }

export type GatewayEvent =
  | MessageStartEvent | MessageDeltaEvent | MessageInterimEvent | MessageCompleteEvent
  | ToolStartEvent | ToolGeneratingEvent | ToolCompleteEvent | ToolOutputRiskEvent
  | ApprovalRequestEvent | ApprovalRespondEvent
  | TurnAbortEvent;

/**
 * The reducer contract (transition table in the .md):
 * pure, idempotent on redelivered events, never throws on unknown types.
 */
export type ChatReducer = (state: ChatState, event: GatewayEvent) => ChatState;

// ── Derived selectors — Invariant 1: every count is computed, never stored ──
// (Structural fix for Mockup finding #4: pending count hand-maintained in 4 places.)

export function selectPendingApprovals(state: ChatState): ApprovalBlock[] {
  const out: ApprovalBlock[] = [];
  for (const turn of state.turns) {
    for (const block of turn.blocks) {
      if (block.type === 'approval' && block.state === 'pending') out.push(block);
    }
  }
  return out;
}

export function pendingApprovalCount(state: ChatState): number {
  return selectPendingApprovals(state).length;
}

export function selectRunningTools(state: ChatState): ToolBlock[] {
  const out: ToolBlock[] = [];
  for (const turn of state.turns) {
    for (const block of turn.blocks) {
      if (block.type === 'tool' && block.status === 'running') out.push(block);
    }
  }
  return out;
}

/** A turn "awaits approval" iff it holds a pending approval block — derived, not a status flag. */
export function isAwaitingApproval(turn: Turn): boolean {
  return turn.blocks.some(b => b.type === 'approval' && b.state === 'pending');
}

/** The single open text tail message.delta appends to, or null → open a new one. */
export function openTextTail(turn: Turn): TextBlock | null {
  const tail = turn.blocks[turn.blocks.length - 1];
  return tail !== undefined && tail.type === 'text' && tail.streaming ? tail : null;
}
