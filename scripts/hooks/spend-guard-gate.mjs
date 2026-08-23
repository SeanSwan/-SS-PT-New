#!/usr/bin/env node
/**
 * spend-guard-gate.mjs — PreToolUse(Bash) gate on paid AI calls.
 * ==============================================================
 * Sean's directive 2026-08-22 after one workstream cost ~$4.87 (Fable $3.47
 * across four calls, Sol $0.92 across two): "we gotta now create a skill that
 * blocks ... shouldn't cost me no more than two or three bucks for that whole
 * thing max ... I would be asked twice before approving."
 *
 * WHY A HOOK AND NOT A SCRIPT EDIT. Two reasons, both load-bearing.
 *   1. The two priciest scripts (consult-fable.mjs, consult-sol.mjs) were being
 *      edited by another agent at the time this was written. Rule 67 says do not
 *      touch a file another agent has in flight. A hook needs none of them.
 *   2. A gate living inside the thing it gates can be bypassed by calling the
 *      model another way. This sits at the harness boundary, so it covers any
 *      invocation shape — including ones written after today.
 *
 * The lesson this session kept teaching: a rule the model must remember is a
 * rule that will eventually be skipped. Deterministic, or it is not a control.
 *
 * FAIL-OPEN on its own errors. A spend guard that bricks the toolchain when it
 * has a bug costs more than the spend it prevents. It fails open loudly.
 */
import { readFileSync } from 'node:fs';
import { checkSpend, CAPS, spentToday, spentOnTopic } from '../lib/spend-ledger.mjs';

const ALLOW = () => process.exit(0);

/** Worst-case $/M (in, out), OpenRouter catalog as of 2026-08-22. */
const PRICES = {
  'claude-fable-5':      [10.0, 50.0],
  'gpt-5.6-sol-pro':     [2.5,  15.0],
  'gpt-5.6-sol':         [2.5,  15.0],
  'kimi-k3':             [3.0,  15.0],
  'grok-4.6':            [2.0,  6.0],
  'deepseek-v4-pro':     [0.48, 0.96],
  'deepseek-v4-flash':   [0.073, 0.145],
};

/** Map a consult script to its default model key. */
const SCRIPT_MODEL = {
  'consult-fable.mjs': 'claude-fable-5',
  'consult-sol.mjs': 'gpt-5.6-sol-pro',
  'consult-kimi.mjs': 'kimi-k3',
  'consult-grok.mjs': 'grok-4.6',
};

function readInput() {
  try { return JSON.parse(readFileSync(0, 'utf-8')); } catch { return null; }
}

const input = readInput();
if (!input) ALLOW();

const cmd = input?.tool_input?.command || '';
if (!cmd || !/consult-(fable|sol|kimi|grok|panel)\.mjs/.test(cmd)) ALLOW();

try {
  // --- which model, and how big is the worst case? -------------------------
  const scriptMatch = cmd.match(/consult-([a-z0-9-]+)\.mjs/);
  const scriptName = scriptMatch ? `consult-${scriptMatch[1]}.mjs` : '';

  // A dry run spends nothing.
  if (/--dry-run/.test(cmd)) ALLOW();

  // The panel prices its own seats and already refuses paid seats without
  // --confirm-spend; gate it only when spend is actually confirmed.
  if (scriptName === 'consult-panel.mjs' && !/--confirm-spend/.test(cmd)) ALLOW();

  // An explicit --model / SWAN_*_MODEL override wins over the script default.
  let modelKey = SCRIPT_MODEL[scriptName] || '';
  const override = cmd.match(/SWAN_[A-Z_]*MODEL=([^\s]+)/) || cmd.match(/--model\s+([^\s]+)/);
  if (override) {
    const hit = Object.keys(PRICES).find((k) => override[1].includes(k));
    if (hit) modelKey = hit;
  }

  // consult-panel fans out to many seats; price it as the whole fan-out.
  const isPanel = scriptName === 'consult-panel.mjs';
  const price = PRICES[modelKey];
  if (!price && !isPanel) ALLOW(); // unknown model — do not guess a number

  const maxTok = Number((cmd.match(/--max-tokens\s+(\d+)/) || [])[1] || 0)
    || Number((cmd.match(/SWAN_[A-Z_]*MAX_TOKENS=(\d+)/) || [])[1] || 0)
    || 16000;

  // Input size is unknown at gate time; assume a large review packet so the
  // worst case is honest rather than flattering.
  const ASSUMED_IN_TOK = 26000;
  const worstCaseUsd = isPanel
    ? 1.20 // whole-panel fan-out, dominated by the paid seats
    : (ASSUMED_IN_TOK / 1e6) * price[0] + (maxTok / 1e6) * price[1];

  // --- topic: what "the whole thing" means --------------------------------
  // Best available proxy for one workstream is the document/out path stem.
  const docMatch = cmd.match(/--document\s+([^\s]+)/) || cmd.match(/--out\s+([^\s]+)/);
  const topic = (docMatch ? docMatch[1] : 'untitled')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(md|txt|json)$/i, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 60) || 'untitled';

  const approvalToken = (cmd.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1] || '';

  const decision = checkSpend({ model: modelKey || 'panel', topic, worstCaseUsd, approvalToken });

  if (decision.allow) {
    if (decision.reason === 'second approval accepted') {
      console.error(`[spend-guard] SECOND APPROVAL ACCEPTED — proceeding. ${decision.breach}`);
    }
    ALLOW();
  }

  // --- refuse: first ask ---------------------------------------------------
  const t = decision.totals;
  const lines = [
    'SPEND GUARD — BLOCKED (first ask). Sean 2026-08-22: a whole workstream should cost $2-3, not $5.',
    '',
    `  model            ${modelKey || 'panel fan-out'}`,
    `  worst case       $${worstCaseUsd.toFixed(2)}   (cap per call $${CAPS.perCall.toFixed(2)})`,
    `  topic            ${topic}`,
    `  spent on topic   $${t.topic.toFixed(2)}        (cap $${CAPS.perTopic.toFixed(2)})`,
    `  spent today      $${t.day.toFixed(2)}        (cap $${CAPS.perDay.toFixed(2)})`,
    '',
    `  BREACH: ${decision.breach}`,
    '',
    'This is the FIRST of two asks. Do NOT re-run with the token on your own.',
    'Show Sean the numbers above and get an explicit yes. Only then re-run with:',
    '',
    `    SWAN_SPEND_APPROVE=${decision.token} <the same command>`,
    '',
    'The token is single-use and bound to this exact model+topic+cost.',
    'Cheaper first: Qwen 3.8 is local and free, GLM 5.3 is subscription, DeepSeek',
    'V4 Flash/Pro are cents. Ask whether the expensive seat is actually needed.',
  ];

  console.error(lines.join('\n'));
  process.exit(2); // non-zero blocks the tool call
} catch (err) {
  // Fail OPEN, loudly. Never brick the toolchain over a guard bug.
  console.error(`[spend-guard] gate error, failing open: ${err?.message}`);
  process.exit(0);
}
