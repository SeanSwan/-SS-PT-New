#!/usr/bin/env node
/**
 * panel-debate.mjs — multi-round hostile debate over one packed document.
 * =========================================================
 * Sean's directive 2026-08-23: panel = GLM 5.3 + Grok 4.6 (two independent
 * seats) + DeepSeek V4 Pro + Ox Alpha; debate up to 20 rounds to final
 * consensus; the panel's fixes get applied AS THEIR DESIGN.
 *
 * Architecture: one transport per seat via the repo's existing consult
 * scripts (consult-glm.mjs / consult-grok.mjs). This orchestrator assembles
 * round documents, fires seats IN PARALLEL, parses their machine-readable
 * verdict blocks, and decides stop conditions. All streaming, idle-watchdog,
 * truncation and redaction logic stays in the seat scripts where it was
 * fixed and incident-documented.
 *
 * STOP CONDITIONS (checked after each round, in order):
 *   1. CONSENSUS — every responded seat reports status CONSENSUS, zero
 *      REJECTs remain, and no new MAJOR finding appeared this round.
 *   2. BUDGET — cumulative spend would cross --budget-usd if the next round
 *      fired. Checked BEFORE firing, so we never overdraw.
 *   3. MAX ROUNDS — default 20 (Sean's ceiling). If debate is unresolved we
 *      stop with an honest DISPUTE record, not a fake yes.
 *
 * SPEND: GLM rides the Z.ai subscription ($0/margin, burns plan credit — the
 * key arrives in the child env as GLM_API_KEY/ZAI_API_KEY, never logged).
 * Ox Alpha is $0/margin BUT stealth: the undisclosed provider RETAINS the
 * prompt — announced on fire; only ever receives the canary-redacted packet.
 * Grok + DeepSeek bill OpenRouter credits within the hard budget cap.
 *
 * USAGE
 *   node scripts/debate/panel-debate.mjs --packet <PACKET.md> \
 *     [--seats glm,grokA,grokB,dspro,ox] [--max-rounds 20] \
 *     [--budget-usd 6.00] [--min-seats 3] [--seat-timeout-sec 360]
 *     [--out-dir <DIR>] [--dry-run]
 *
 * EXIT: 0 consensus · 1 config/total failure · 2 max rounds, dispute stays ·
 *       3 budget guard tripped · 4 seat transport failed mid-run
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

// Deterministic parser self-test: `node panel-debate.mjs --selftest`. A parser that
// eats a real verdict block would silently void every round — this must pass before
// any paid round fires. Runs BEFORE the --packet gate so it needs no packet.
if (process.argv.includes('--selftest')) {
  const T = (name, txt) => {
    const v = parseVerdict(txt);
    if (!v) throw new Error(`${name}: returned null`);
    return v;
  };
  const good = T('good', `prose before
=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F1=MAJOR: seed.mjs L42: claim | F2=MINOR: wf.yml step-7: claim
rebuttals: F1=REJECT: evidence wrong | F3=AGREE
open: Q1=what to decide
consensus_block: line one
line two
=== END-VERDICT ===
prose after`);
  if (good.status !== 'DISPUTE' || good.confidence !== 88) throw new Error('good: status/confidence wrong');
  if (good.findings.length !== 2 || good.findings[0] !== 'F1=MAJOR: seed.mjs L42: claim') throw new Error(`good: findings wrong: ${JSON.stringify(good.findings)}`);
  if (good.rebuttals.length !== 2) throw new Error('good: rebuttals wrong');
  if (good.open.length !== 1) throw new Error('good: open wrong');
  if (good.block !== 'line one\nline two') throw new Error(`good: block wrong: ${JSON.stringify(good.block)}`);
  const none = T('none-lists', `=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: (none)
rebuttals: (none)
open: (none)
consensus_block: the ruling
=== END-VERDICT ===`);
  if (none.status !== 'CONSENSUS' || none.findings.length !== 0 || none.rebuttals.length !== 0 || none.open.length !== 0) throw new Error('none-lists: wrong');
  if (none.block !== 'the ruling') throw new Error('none-lists: block wrong');
  if (parseVerdict('no block here') !== null) throw new Error('absent: should be null');
  if (parseVerdict('=== VERDICT ===\nconfidence: 50\n=== END-VERDICT ===') !== null) throw new Error('no-status: should be null');
  // If a real seat reply exists, parse it too — the truest test case.
  let realParsed = '(no real artifact)';
  const realCand = join(SCRIPT_DIR, '..', '..', 'docs', 'ai-workflow', 'AI-HANDOFF', 'panel-debate-shadow-seed-2026-08-23', 'rounds', 'round-1', 'GLM.md');
  if (existsSync(realCand)) {
    const v = parseVerdict(readFileSync(realCand, 'utf8'));
    if (!v) throw new Error('real GLM.md: parse failed');
    realParsed = `parsed: status=${v.status} conf=${v.confidence} findings=${v.findings.length} rebuttals=${v.rebuttals.length} open=${v.open.length} block_lines=${v.block.split('\n').length}`;
  }
  console.log(`[debate] SELFTEST PASS — good / none-lists / absent / no-status · real-artifact: ${realParsed}`);
  process.exit(0);
}

const packetPath = arg('--packet');
if (!packetPath || !existsSync(packetPath)) {
  console.error('usage: node scripts/debate/panel-debate.mjs --packet <path> [--seats ...] [--max-rounds 20] [--budget-usd 6.00] [--dry-run]');
  process.exit(1);
}
const maxRounds = Math.max(1, Number(arg('--max-rounds', '20')));
const budgetUsd = Number(arg('--budget-usd', '6.00'));
const minSeats = Number(arg('--min-seats', '3'));
const seatTimeoutMs = Math.min(900, Math.max(60, Number(arg('--seat-timeout-sec', '360')))) * 1000;
const dryRun = argv.includes('--dry-run');
const requested = [...new Set(arg('--seats', 'glm,grokA,grokB,dspro,ox')
  .split(',').map((s) => s.trim()).filter(Boolean))];

// GLM key: Sean added it to the hermes profile .env as GLM_API_KEY. Load it
// HERE (never printed) and hand it to the GLM child as ZAI_API_KEY, the name
// consult-glm.mjs already reads. Absence is a warn, not a halt — the 4 other
// seats still run.
let glmKey = process.env.GLM_API_KEY || process.env.ZAI_API_KEY || '';
if (!glmKey) {
  // WSL home, derived not hardcoded (2026-08-27). $USER is the POSIX account under
  // WSL; otherwise fall back to the Windows account LOWERCASED, since WSL usernames
  // are lowercase while Windows ones are not. HERMES_HOME overrides.
  const hermesHome = process.env.HERMES_HOME
    || `/home/${process.env.USER || (process.env.USERNAME || '').toLowerCase()}`;
  for (const p of [`${hermesHome}/hermes2/.hermes/.env`, `${hermesHome}/.hermes/.env`]) {
    if (existsSync(p)) {
      const m = readFileSync(p, 'utf8').match(/^\s*GLM_API_KEY=(.+)$/m) || readFileSync(p, 'utf8').match(/^\s*ZAI_API_KEY=(.+)$/m);
      if (m && m[1].trim() && !m[1].startsWith('#')) { glmKey = m[1].trim(); break; }
    }
  }
}

const SEATS = {
  glm: { script: 'consult-glm.mjs', label: 'GLM 5.3',
    stance: 'Full-spectrum hostile review: correctness, security, schema truth, and the 8 acceptance criteria line by line.',
    inPerM: 0, outPerM: 0, costAxis: 'Z.ai subscription — $0/margin, burns plan credit',
    env: glmKey ? { ZAI_API_KEY: glmKey, GLM_API_KEY: glmKey } : {} },
  grokA: { script: 'consult-grok.mjs', label: 'Grok 4.6 (seat A)',
    stance: 'ATTACK LENS: correctness — state machines, edge cases, race conditions, FK/cycle logic, Postgres SQL truth, SQL injection surface.',
    inPerM: 2, outPerM: 6, costAxis: 'OpenRouter credits', env: { SWAN_GROK_MODEL: 'x-ai/grok-4.6' } },
  grokB: { script: 'consult-grok.mjs', label: 'Grok 4.6 (seat B)',
    stance: 'ATTACK LENS: security + data-truth + CI integrity — trust boundaries, path handling, migrate->seed->migrate ordering, assert robustness, false-success language.',
    inPerM: 2, outPerM: 6, costAxis: 'OpenRouter credits', env: { SWAN_GROK_MODEL: 'x-ai/grok-4.6' } },
  dspro: { script: 'consult-grok.mjs', label: 'DeepSeek V4 Pro',
    stance: 'Inference auditor: verify the builder\u2019s local-verification claims AGAINST the code in the packet — happy-path-only logic, type drift, stale-state bugs. Highest-evidence bar.',
    inPerM: 0.48, outPerM: 0.96, costAxis: 'OpenRouter credits', env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-pro' } },
  ox: { script: 'consult-grok.mjs', label: 'Ox Alpha (stealth)',
    stance: 'Fresh-eyes adversarial: find the defect class the other stances structurally miss. No prior context; do not defer to other seats.',
    inPerM: 0, outPerM: 0, costAxis: '$0/margin; DATA: stealth provider RETAINS the prompt (canary-redacted packet only)',
    env: { SWAN_GROK_MODEL: 'stealth/ox-alpha' } },
};
const unknown = requested.filter((s) => !SEATS[s]);
if (unknown.length) {
  console.error(`unknown seat(s): ${unknown.join(', ')} — valid: ${Object.keys(SEATS).join(', ')}`);
  process.exit(1);
}
if (!glmKey && requested.includes('glm')) console.log('[debate] ⚠ GLM key not found — GLM seat will fail-fast; other seats unaffected.');

const outDir = arg('--out-dir', dirname(packetPath));
const roundsDir = join(outDir, 'rounds');
const statePath = join(outDir, 'debate-state.json');
const FINAL_PATH = join(outDir, 'FINAL-CONSENSUS.md');
const packet = readFileSync(packetPath, 'utf8');
const packetTitle = packet.match(/^#\s+(.+)$/mu)?.[1]?.trim() || basename(packetPath);
const packetIdentity = resolve(packetPath);
const packetFingerprint = createHash('sha256').update(packet).digest('hex');
const ASSUMED_OUT_TOK = 12000;

const emptyState = () => ({
  roundsAnswered: 0,
  unresolved: [],
  consensusCandidate: null,
  winner: null,
  costUsd: 0,
  log: [],
  packetIdentity,
  packetFingerprint,
});
const loadState = () => {
  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    if (state.packetIdentity !== packetIdentity || state.packetFingerprint !== packetFingerprint) return emptyState();
    return state;
  } catch {
    return emptyState();
  }
};
const saveState = (st) => writeFileSync(statePath, JSON.stringify(st, null, 2), 'utf8');

/** Frame shared by ALL seats for a round (seat-neutral). */
function sharedFrame(round, state) {
  const lines = [
    `You are ONE seat in a MULTI-ROUND HOSTILE DEBATE (round ${round} of up to ${maxRounds}) over the packaged SS-PT subject titled "${packetTitle}" below. Your seat stance is stated in the remit above the document; hold THAT lens, do not drift to the other seats'.`,
    '',
    'RULES OF THIS DEBATE (binding):',
    '1. Every finding needs file + line (or workflow step) evidence FROM THE PACKET. Unlocatable claims will be cut by other seats — make yours locatable.',
    '2. A finding = CLAIM about a defect in the packaged code, severity MAJOR (breaks a correctness/safety/build contract) | MINOR | NOTE.',
    '3. Round 2+: the RUNNING CONSENSUS is quoted. CONSENSUS = you adopt it verbatim except items you REJECT with evidence. DISPUTE = you carry at least one REJECT or a new MAJOR.',
    '4. No hedging. No "should be fine" without a named verified path in the packet. Vague praise is discarded.',
    '5. Builder claims in the packet header are TESTABLE assertions — if the code contradicts one, the contradiction is a finding; cite both sides.',
    '6. Endorse the fixes the way an engineer applies them: WHAT, WHERE (file:line), HOW — no re-derivation needed.',
    '',
    'END EVERY REPLY with EXACTLY this verdict block (the orchestrator parses it strictly; keep key lines on one line each, items separated by |):',
    '=== VERDICT ===',
    'status: CONSENSUS',
    'confidence: 92',
    'findings: F1=MAJOR: file.js L123: claim text | F2=MINOR: file.yml step-7: claim text',
    'rebuttals: F1=REJECT: why the evidence is wrong | F3=AGREE          (round 1 may be: rebuttals: (none))',
    'open: Q1=what other seats must decide',
    'consensus_block: REQUIRED when status is CONSENSUS — the complete ruling: findings to fix with exact fixes, findings accepted as intentional, and residual risks. May be multi-line.',
    '=== END-VERDICT ===',
  ];
  if (state.roundsAnswered > 0) {
    lines.push('', `## RUNNING STATE (rounds answered: ${state.roundsAnswered})`);
    lines.push(`Unresolved findings: ${state.unresolved.length ? state.unresolved.join('  |  ') : '(none)'}`);
    if (state.consensusCandidate) lines.push('', '## CONSENSUS CANDIDATE — adopt it or REJECT parts with evidence', '', '```', state.consensusCandidate, '```');
  }
  return lines.join('\n');
}

/** Per-seat remit injected via each child's --remit (this is where the stance lives). */
function seatRemit(name, round, state) {
  return `SEAT REMIT — you are ${SEATS[name].label}: ${SEATS[name].stance}\n\nThe document that follows is the shared round frame plus the full code packet. Apply your stance to it.` + '\n\n' + sharedFrame(round, state);
}

/** Parse the strict verdict block. Returns object or null (malformed = dropped). */
function parseVerdict(text) {
  const m = text.match(/=== VERDICT ===([\s\S]*?)=== END-VERDICT ===/);
  if (!m) return null;
  const keys = ['status', 'confidence', 'findings', 'rebuttals', 'open', 'consensus_block'];
  const v = { status: null, confidence: 0, findings: [], rebuttals: [], open: [], block: '' };
  let cur = null;
  for (const raw of m[1].split('\n')) {
    let line = raw.trimEnd();
    const hit = keys.find((k) => line.startsWith(k + ':'));
    if (hit) { cur = hit; line = line.slice(hit.length + 1).trim(); }
    if (cur === 'status') v.status = /CONSENSUS/.test(line) ? 'CONSENSUS' : /DISPUTE/.test(line) ? 'DISPUTE' : v.status;
    else if (cur === 'confidence') v.confidence = Number(line) || 0;
    else if ((cur === 'findings' || cur === 'rebuttals' || cur === 'open') && line && !/^(none)$/.test(line)) {
      const items = line.split('|').map((x) => x.trim()).filter((x) => x && x !== '(none)');
      if (items.length) v[cur === 'findings' ? 'findings' : cur === 'rebuttals' ? 'rebuttals' : 'open'].push(...items);
    }
    else if (cur === 'consensus_block' && line) v.block += (v.block ? '\n' : '') + line;
  }
  if (!v.status) return null;
  return v;
}

const seatOutPath = (name, round) => join(roundsDir, `round-${round}`, `${name.toUpperCase()}.md`);

function runSeat(name, round, docPath) {
  const s = SEATS[name];
  const outPath = seatOutPath(name, round);
  mkdirSync(dirname(outPath), { recursive: true });
  const args = [join(SCRIPT_DIR, '..', s.script), '--document', docPath, '--out', outPath, '--remit', seatRemit(name, round, loadState())];
  if (s.script === 'consult-glm.mjs') args.push('--model', 'glm-5.3');
  return new Promise((settle) => {
    const t0 = Date.now();
    console.log(`  -> ${name} (${s.label}) firing [${s.costAxis}]`);
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'], shell: false,
      env: { ...process.env, ...s.env },
    });
    let stderr = '';
    let settled = false;
    const finish = (r) => { if (settled) return; settled = true; clearTimeout(wall); settle(r); };
    const wall = setTimeout(() => { child.kill('SIGKILL'); finish({ name, ok: false, err: `hung >${seatTimeoutMs / 1000}s — killed` }); }, seatTimeoutMs);
    child.stdout.on('data', (d) => process.stdout.write(`     [${name}] ${d}`));
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('error', (err) => finish({ name, ok: false, err: `spawn: ${err.message}` }));
    child.on('close', (code) => {
      let text = '';
      try { text = readFileSync(outPath, 'utf8'); } catch { /* no file */ }
      const empty = /content = ''|\(empty( response)?\)/.test(text) || text.length < 400;
      if (code === 0 && !empty) {
        const v = parseVerdict(text);
        if (v) return finish({ name, ok: true, v, wall: ((Date.now() - t0) / 1000).toFixed(1) });
        return finish({ name, ok: false, err: 'reply arrived but VERDICT BLOCK MALFORMED — dropped (see seat file)' });
      }
      if (s.label.includes('GLM') && empty) {
        return finish({ name, ok: false, err: 'GLM EMPTY-FILE BUG (known): too-small budget -> empty reply. Known bug, not a skip — retry next round with higher --max-tokens on the seat args.' });
      }
      const cm = stderr.match(/tokens \d+ in \/ \d+ out — cost ~?(\$[\d.]+)/);
      return finish({ name, ok: false, truncated: code === 2, err: `exit ${code}${empty ? ', ' : ''}${empty ? 'no usable reply' : ''}${cm ? ` (spent ${cm[1]} before failing)` : ''}: ${stderr.trim().slice(-300)}` });
    });
  });
}

let totalCost = 0;          // real cost, parsed from each seat's own header
const estimated = (name, docChars) => (docChars / 1e6) * SEATS[name].inPerM + (ASSUMED_OUT_TOK / 1e6) * SEATS[name].outPerM;

console.log(`[debate] packet=${packetPath} (~${Math.round(packet.length / 4)} tok)`);
console.log(`[debate] seats=${requested.join(', ')} · min-answer gate=${minSeats} · budget=$${budgetUsd.toFixed(2)} · max rounds=${maxRounds}`);
if (requested.includes('ox')) console.log('[debate] ⚠ DATA EGRESS — Ox Alpha: $0/margin but its undisclosed provider RETAINS this prompt (canary-redacted packet only).');
if (dryRun) {
  const perRound = requested.reduce((s, n) => s + estimated(n, packet.length), 0);
  console.log(`[debate] --dry-run: nothing sent, nothing spent. Est. per round ~$${perRound.toFixed(4)}; est. full 20-round spend ~$${(perRound * maxRounds).toFixed(2)}.`);
  process.exit(0);
}

let verdict = 'maxrounds';
let finalText = null;
let stopsInARow = 0;

for (let round = 1; round <= maxRounds; round++) {
  // Budget guard BEFORE firing: never start a round that would cross the cap.
  const docChars = packet.length + round * 2500; // frame grows slightly per round
  const roundEst = requested.reduce((s, n) => s + estimated(n, docChars), 0);
  if (totalCost + roundEst > budgetUsd && totalCost > 0) {
    verdict = 'budget';
    console.error(`[debate] BUDGET GUARD: $${totalCost.toFixed(4)} spent + $${roundEst.toFixed(4)} next round > $${budgetUsd.toFixed(2)} cap — stopping BEFORE round ${round}.`);
    break;
  }
  const state = loadState();
  const doc = `# DEBATE ROUND ${round} / up to ${maxRounds}\n\n(The per-seat remit + stance were delivered alongside this document. The shared rules, running state, and code packet are below.)\n\n${sharedFrame(round, state)}\n\n# THE PACKAGED CODE UNDER REVIEW\n${packet}`;
  const docPath = join(roundsDir, `round-${round}`, 'REVIEW-DOC.md');
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, doc, 'utf8');
  console.log(`\n[debate] === ROUND ${round} === doc=${(doc.length / 1024).toFixed(0)}KB · firing ${requested.length} seats in parallel`);

  // Per-seat remit inside each child (the shared doc keeps one canonical copy).
  const results = await Promise.all(requested.map((n) => runSeat(n, round, docPath)));

  // Cost truth from each seat's own header; fall back to catalog estimate.
  let roundReal = 0;
  for (const r of results) {
    let c = 0;
    try {
      const cm = readFileSync(seatOutPath(r.name, round), 'utf8').match(/\*\*Cost:\*\*\s*~?\$([\d.]+)/);
      if (cm) c = Number(cm[1]);
    } catch { /* seat wrote nothing */ }
    if (!c) c = estimated(r.name, docChars);
    if (r.ok) roundReal += c;
  }
  totalCost += roundReal;

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  for (const r of failed) console.error(`[debate] ⚠ ${r.name}: ${r.err}`);

  const st = loadState();
  st.log.push({ round, answered: ok.map((r) => `${r.name}:${r.v.status}@${r.v.confidence}`).join(' '), failed: failed.map((r) => r.name).join(',') || null, spentUsdRound: Number(roundReal.toFixed(4)), totalUsd: Number(totalCost.toFixed(4)) });

  if (ok.length < minSeats) {
    // Degenerate round — seats didn't answer. Do NOT count toward consensus.
    stopsInARow++;
    st.roundsAnswered = round;
    st.log.push({ note: `DEGENERATE: only ${ok.length}/${requested.length} answered (< ${minSeats}) — round not counted toward consensus` });
    saveState(st);
    if (round === maxRounds || stopsInARow >= 3) { saveState(st); verdict = round === maxRounds ? 'maxrounds' : 'budget'; break; }
    continue;
  }
  stopsInARow = 0;
  st.roundsAnswered = round;

  const findings = [...new Set(ok.flatMap((r) => r.v.findings))];
  const rejects = ok.flatMap((r) => (r.v.rebuttals || []).filter((x) => x.includes('REJECT')));
  const newMajor = findings.filter((f) => f.includes('MAJOR'));
  const candidates = ok.filter((r) => r.v.status === 'CONSENSUS');
  st.unresolved = findings.map((f) => f.split(':', 2).slice(1).join(':').trim()).filter((f) => !rejects.some((x) => x.includes(f.slice(0, 2))));
  if (candidates.length) {
    const best = [...candidates].sort((a, b) => b.v.confidence - a.v.confidence)[0];
    st.consensusCandidate = best.v.block || st.consensusCandidate;
    st.winner = best.name;
  }

  const CONSENSUS = candidates.length === ok.length && rejects.length === 0 && newMajor.length === 0;
  saveState(st);
  console.log(`[debate] round ${round}: answered ${ok.length}/${requested.length} · findings=${findings.length} rejects=${rejects.length} newMAJOR=${newMajor.length} · real spend $${roundReal.toFixed(4)} (total $${totalCost.toFixed(4)})`);

  if (CONSENSUS) {
    verdict = 'consensus';
    finalText = candidates.sort((a, b) => b.v.confidence - a.v.confidence)[0].v.block || '(consensus reached but the winning consensus_block was empty — see round files)';
    break;
  }
}

if (verdict !== 'consensus') {
  const st = loadState();
  finalText = `> ⚠ **DISPUTE REMAINS** — debate stopped at round ${st.roundsAnswered} of ${maxRounds} (${verdict}). No fake consensus: the strongest candidate ruling so far is below; the unresolved items are listed in \`${statePath}\`.\n\nCandidate block:\n\n${st.consensusCandidate || '(no candidate consensus block was produced — every round carried open disputes; see rounds/ files)'}\n`;
}
if (finalText) {
  const st = loadState();
  writeFileSync(FINAL_PATH, `# HOSTILE DEBATE — ${verdict.toUpperCase()} RESULT\n\n**Packet:** \`${packetPath}\`\n**Rounds answered:** ${st.roundsAnswered} · **Real spend:** ~$${totalCost.toFixed(4)} · **Strongest seat:** ${st.winner || 'n/a'}\n**Roster:** ${requested.map((n) => `${SEATS[n].label}`).join(' · ')}\n\n---\n\n${finalText}\n`, 'utf8');
}
console.log(`\n[debate] ===== FINAL: ${verdict.toUpperCase()} ===== rounds=${loadState().roundsAnswered} spend=~$${totalCost.toFixed(4)}`);
if (finalText) console.log(`[debate] ruling -> ${FINAL_PATH}`);
if (loadState().log.some((l) => l.note && l.note.includes('DEGENERATE')) && requested.includes('glm')) console.log('[debate] note: GLM empty-file bug is a KNOWN transport bug (documented 2026-08-23) — a retry with a higher token ceiling is the fix, not dropping the seat.');
process.exit(verdict === 'consensus' ? 0 : verdict === 'budget' ? 3 : 2);
