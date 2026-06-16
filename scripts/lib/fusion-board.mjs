/**
 * Fusion Board — shared-folder polling blackboard for multi-agent fusion
 * ======================================================================
 * Sean's model (2026-06-15): all AIs point to ONE folder, each writes its own
 * file, and every ~20s they poll to see what the others have written and "time
 * each other out." This module is the deterministic protocol underneath that —
 * the live coordination layer for the subscription triangle (Claude + Codex +
 * Gemini) and any N-agent fusion.
 *
 * It builds ON fusion-handoff.mjs (which scaffolds request.md + answers/<agent>.md
 * + meta.json) and adds:
 *   - board.json  — live status: per-agent {status, round, updatedAt, file}
 *   - postContribution / othersView — write your file, see the others'
 *   - boardStatus — staleness/timeout flags ("time each other out")
 *   - pollUntilReady — the ~20s poll loop with an overall timeout
 *
 * Execution model: each agent runs in its OWN process and attaches to the same
 * board dir — Claude/Gemini via their CLIs (`claude -p` / `gemini -p`, stdout
 * redirected into their board file), Codex via its own session writing
 * answers/codex.md. The board is the blackboard they all watch. Clock + sleep are
 * injectable so the poll loop is unit-testable without real time.
 *
 * Privacy (Rule 8): board files live under gitignored .ai-workflow/fusion/ — keep
 * task/context to IDs/roles, no client PII.
 *
 * @module fusion-board
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createFusionRun, answerPath, atomicWrite, DEFAULT_BRAINS } from './fusion-handoff.mjs';

/** Sean's cadence: check the board ~every 20 seconds. */
export const DEFAULT_POLL_MS = 20_000;
/** Consider an agent timed-out after this much idle with no contribution. */
export const DEFAULT_AGENT_TIMEOUT_MS = 5 * 60_000;
/** Overall poll ceiling before giving up on missing agents. */
export const DEFAULT_OVERALL_TIMEOUT_MS = 10 * 60_000;

export function boardPath(dir) {
  return join(dir, 'board.json');
}

function contributionPath(dir, agent, round) {
  return round > 1 ? join(dir, 'answers', `${agent}.r${round}.md`) : answerPath(dir, agent);
}

/**
 * Create a fusion run AND its board.json. Triangle default = Claude + Codex + Gemini.
 * @returns {{ dir, requestPath, answersDir, metaPath, boardPath, agents, board }}
 */
export function initBoard({ root, runId, task, context = '', agents = DEFAULT_BRAINS, createdAt }) {
  const run = createFusionRun({ root, runId, topic: runId, task, context, brains: agents, createdAt });
  const board = {
    runId,
    round: 1,
    phase: 'answer', // two-phase barrier: 'answer' (blind, write-own-only) -> 'synthesis' (sealed, judge reads)
    createdAt: createdAt || new Date().toISOString(),
    agents: Object.fromEntries(agents.map((a) => [a, { status: 'pending', round: 0, updatedAt: null, file: null }])),
  };
  const bp = boardPath(run.dir);
  atomicWrite(bp, JSON.stringify(board, null, 2));
  return { ...run, agents, boardPath: bp, board };
}

export function readBoard(dir) {
  return JSON.parse(readFileSync(boardPath(dir), 'utf-8'));
}

/**
 * An agent posts/updates its contribution for a round and stamps the board.
 * Round > 1 files are suffixed (.r2.md) so refine rounds don't clobber round 1.
 */
export function postContribution(dir, agent, text, { round = 1, now } = {}) {
  const board = readBoard(dir);
  // Two-phase barrier: once sealed, the answer phase is over — late posts are
  // rejected (no-op) so a straggler can't mutate a synthesized round.
  if (board.phase === 'synthesis') return null;
  const p = contributionPath(dir, agent, round);
  atomicWrite(p, String(text ?? ''));
  if (!board.agents[agent]) board.agents[agent] = {};
  board.agents[agent] = { status: 'done', round, updatedAt: now || new Date().toISOString(), file: p };
  atomicWrite(boardPath(dir), JSON.stringify(board, null, 2));
  return p;
}

/**
 * Seal the answer phase → synthesis phase. After sealing, postContribution is
 * rejected and othersView/the judge may read all answers. This is the
 * anti-contamination half of the two-phase barrier (no cross-reads until every
 * answer is committed and the round is closed).
 */
export function sealBoard(dir, { now } = {}) {
  const board = readBoard(dir);
  board.phase = 'synthesis';
  board.sealedAt = now || new Date().toISOString();
  atomicWrite(boardPath(dir), JSON.stringify(board, null, 2));
  return board;
}

/**
 * What the OTHER agents have written — for the synthesis/refine phase. Returns []
 * while the board is still in the 'answer' phase, enforcing blindness so an agent
 * cannot peek at peers before committing (prevents fake consensus).
 */
export function othersView(dir, agent, { agents } = {}) {
  const board = readBoard(dir);
  if (board.phase !== 'synthesis') return [];
  const names = (agents || Object.keys(board.agents)).filter((n) => n !== agent);
  return names.map((n) => {
    const a = board.agents[n] || {};
    const file = a.file || answerPath(dir, n);
    const text = existsSync(file) ? readFileSync(file, 'utf-8').trim() : '';
    return { name: n, status: a.status === 'done' && text ? 'done' : 'pending', text };
  });
}

/**
 * Per-agent status with staleness/timeout flags ("time each other out").
 * A DONE agent's age is measured from its contribution; a PENDING agent's age is
 * measured from when the board opened — so an agent that never shows up within the
 * stale window is correctly flagged timedOut (that's the whole point of the model).
 */
export function boardStatus(dir, { agents, staleMs = DEFAULT_AGENT_TIMEOUT_MS, now } = {}) {
  const board = readBoard(dir);
  const names = agents || Object.keys(board.agents);
  const nowMs = now != null ? now : Date.now();
  const boardOpenedMs = board.createdAt ? Date.parse(board.createdAt) : nowMs;
  return names.map((n) => {
    const a = board.agents[n] || { status: 'pending', updatedAt: null };
    const done = a.status === 'done';
    const sinceMs = a.updatedAt ? Date.parse(a.updatedAt) : boardOpenedMs;
    const ageMs = nowMs - sinceMs;
    return { name: n, status: a.status, done, updatedAt: a.updatedAt, ageMs, timedOut: !done && ageMs > staleMs };
  });
}

/** True when every agent has a done contribution for the given round. */
export function allReady(dir, { agents, round = 1 } = {}) {
  const board = readBoard(dir);
  const names = agents || Object.keys(board.agents);
  return names.every((n) => board.agents[n]?.status === 'done' && (board.agents[n]?.round || 0) >= round);
}

/**
 * Poll the board ~every intervalMs until all agents are ready OR the overall
 * timeout elapses. Clock + sleep are injectable for deterministic tests.
 * @returns {Promise<{ ready:boolean, timedOut:boolean, missing?:string[], board:object }>}
 */
export async function pollUntilReady(dir, {
  agents,
  round = 1,
  intervalMs = DEFAULT_POLL_MS,
  timeoutMs = DEFAULT_OVERALL_TIMEOUT_MS,
  nowFn = () => Date.now(),
  sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = () => {},
} = {}) {
  const start = nowFn();
  for (;;) {
    if (allReady(dir, { agents, round })) return { ready: true, timedOut: false, board: readBoard(dir) };
    if (nowFn() - start >= timeoutMs) {
      const missing = boardStatus(dir, { agents, now: nowFn() }).filter((s) => !s.done).map((s) => s.name);
      return { ready: false, timedOut: true, missing, board: readBoard(dir) };
    }
    const waiting = boardStatus(dir, { agents, now: nowFn() }).filter((s) => !s.done).map((s) => s.name);
    log(`[board] waiting on ${waiting.join(', ') || 'none'} (${Math.round((nowFn() - start) / 1000)}s)`);
    await sleepFn(intervalMs);
  }
}
