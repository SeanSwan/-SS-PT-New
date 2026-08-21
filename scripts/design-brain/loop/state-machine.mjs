/**
 * state-machine.mjs — the Design Brain loop orchestrator (S1 walking skeleton).
 * ============================================================================
 * BLUEPRINT: DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md §S1 (SWA-185).
 * Six-seat panel consensus (INDEX.md, panel-2026-08-20-design-brain): the core
 * defect class of this repo's design system is "writer without reader" —
 * artifacts produced that nothing is forced to consume. This engine is the
 * cure shape: a typed state machine where EVERY transition requires the
 * previous state's schema-validated artifact, and the run cannot close
 * without a hash-pinned receipt.
 *
 *   BRIEF → CONTENT → STRUCTURE → MATERIALS → RENDER
 *         → INSPECT → CRITIQUE → REVISE → VERIFY → LEARN
 *
 * Stages are INJECTED functions, so tests can stub or disable any one of
 * them and assert the run fails loudly AT THAT STATE (the S1 acceptance
 * test). The engine never degrades gracefully to prose.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  validateBrief, validateContentModel, validateLayoutIR, validateMaterialPlan,
  validateRenderArtifact, validateInspectReport, validateCritiqueReport,
  validateVerifyReport, validateReceipt,
} from './contracts.mjs';

/** Thrown whenever a transition gate refuses. Carries the state so failures are loud AND located. */
export class StateError extends Error {
  constructor(state, defects) {
    super(`[loop] HALT at ${state} — ${defects.length} defect(s):\n  - ${defects.join('\n  - ')}`);
    this.state = state;
    this.defects = defects;
  }
}

export const STATES = [
  'BRIEF', 'CONTENT', 'STRUCTURE', 'MATERIALS', 'RENDER',
  'INSPECT', 'CRITIQUE', 'REVISE', 'VERIFY', 'LEARN',
];

const GATES = {
  BRIEF: validateBrief,
  CONTENT: validateContentModel,
  STRUCTURE: validateLayoutIR,
  MATERIALS: validateMaterialPlan,
  RENDER: validateRenderArtifact,
  INSPECT: validateInspectReport,
  CRITIQUE: validateCritiqueReport,
  // REVISE re-emits a render artifact (possibly unchanged) — same gate as RENDER.
  REVISE: validateRenderArtifact,
  VERIFY: validateVerifyReport,
  // LEARN's artifact is the atelier session line; the stage itself calls the
  // canonical validator from log-atelier-session.mjs (one schema, one gate).
  LEARN: (a) => (a && a.session_appended === true ? [] : ['LEARN must append a valid atelier session (session_appended !== true)']),
};

export const hash = (obj) => createHash('sha256').update(typeof obj === 'string' ? obj : JSON.stringify(obj)).digest('hex').slice(0, 16);

/**
 * Run the loop. `stages` maps state name -> async fn(ctx) returning that
 * state's artifact. `ctx` accumulates: {brief, content, ir, materials, render,
 * inspect, critique, revise, verify, learn, runDir, profile, options}.
 * Returns {receipt, ctx}. Throws StateError on any gate refusal.
 */
export async function runLoop({ brief, stages, profile, runRoot, ledgerPath, renderOpts, browserInspect, captureFn, vault, vaultRoot, now = () => new Date().toISOString() }) {
  if (!profile || typeof profile !== 'object' || !Array.isArray(profile.levers)) {
    // Deleted/absent taste profile must fail LOUDLY at STRUCTURE's prerequisite,
    // not silently produce untasted defaults (S1 acceptance test a).
    throw new StateError('STRUCTURE', ['taste profile missing or malformed — the loop refuses to select structure untasted']);
  }
  const runId = `run-${now().replace(/[:.]/g, '-')}`;
  const runDir = join(runRoot, runId);
  mkdirSync(runDir, { recursive: true });

  const ctx = { brief, profile, runDir, ledgerPath, renderOpts, browserInspect, captureFn, vault, vaultRoot, artifacts: {} };
  const stateLog = [];
  const keyFor = {
    BRIEF: 'brief', CONTENT: 'content', STRUCTURE: 'ir', MATERIALS: 'materials',
    RENDER: 'render', INSPECT: 'inspect', CRITIQUE: 'critique', REVISE: 'revise',
    VERIFY: 'verify', LEARN: 'learn',
  };

  for (const state of STATES) {
    const stage = state === 'BRIEF' ? async () => brief : stages[state];
    if (typeof stage !== 'function') throw new StateError(state, [`stage ${state} is missing or disabled — the loop does not skip states`]);
    let artifact;
    try {
      artifact = await stage(ctx);
    } catch (err) {
      if (err instanceof StateError) throw err;
      throw new StateError(state, [`stage threw: ${err.message}`]);
    }
    const defects = GATES[state](artifact);
    if (defects.length) throw new StateError(state, defects);

    // Cross-artifact chain locks (S1 acceptance test b): nothing renders
    // without proven content + structure lineage.
    if (state === 'RENDER' || state === 'REVISE') {
      if (artifact.layout_ir_id !== ctx.artifacts.ir.layout_ir_id) {
        throw new StateError(state, ['render layout_ir_id does not match the gated STRUCTURE artifact']);
      }
      if (artifact.content_model_id !== ctx.artifacts.content.content_model_id) {
        throw new StateError(state, ['render content_model_id does not match the gated CONTENT artifact']);
      }
    }

    ctx.artifacts[keyFor[state]] = artifact;
    const artifactHash = hash(artifact);
    stateLog.push({ state, artifact_hash: artifactHash, at: now() });
    writeFileSync(join(runDir, `${stateLog.length}-${state}.json`), JSON.stringify(artifact, null, 2));
  }

  const receipt = {
    run_id: runId,
    brief_id: brief.brief_id,
    state_log: stateLog,
    taste_profile_hash: hash(profile),
    spend_usd: 0,
    finished_at: now(),
  };
  const receiptDefects = validateReceipt(receipt);
  if (receiptDefects.length) throw new StateError('RECEIPT', receiptDefects);
  writeFileSync(join(runDir, 'RECEIPT.json'), JSON.stringify(receipt, null, 2));
  return { receipt, ctx };
}
