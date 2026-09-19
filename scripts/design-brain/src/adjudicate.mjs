/**
 * adjudicate.mjs — import Sean's DECIDE letters; the ONLY path that changes claim status.
 * =======================================================================================
 * Reads the edited batch packet, applies decisions to the durable ledger (claims.jsonl),
 * regenerates INDEX.md. Rules:
 *   - Only a human edits packets; this tool only TRANSCRIBES those edits. Agents never call it
 *     with fabricated letters — the humanDecision block names the actor from --actor (default
 *     "sean"), and the audit ledger records the import.
 *   - Unmarked claims stay `proposed` (skipping allowed, guessing not).
 *   - A merge target must exist and not itself be merged (no merge chains at n≈70).
 *   - claims.jsonl is append-authoritative: adjudicated claims move from claims-proposed.jsonl
 *     into claims.jsonl with status + humanDecision set. Idempotent per claimId: a claim already
 *     in claims.jsonl is never re-imported (re-running a batch cannot double-apply).
 *
 * USAGE
 *   node src/adjudicate.mjs --root <data-root> --batch <edited BATCH-*.md> [--actor sean]
 *
 * @module design-brain/adjudicate
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveDataRoot } from './paths.mjs';
import { safeWriteText, appendJsonl } from './writer.mjs';
import { readJsonl, loadClaims } from './synthesize.mjs';
import { confidenceFor } from './validate.mjs';

const LETTER_STATUS = { a: 'accepted', r: 'rejected', t: 'trial' };

/** Pure core: parse `### CLM-… / DECIDE: x` pairs out of an edited packet. */
export function parseDecisions(packetText) {
  const decisions = new Map();
  let current = null;
  for (const line of String(packetText).split('\n')) {
    const h = line.match(/^### (CLM-[A-Za-z0-9-]+)\b/);
    if (h) { current = h[1]; continue; }
    const d = line.match(/^DECIDE:\s*([artm])\b\s*(CLM-[A-Za-z0-9-]+)?/i);
    if (d && current) {
      const letter = d[1].toLowerCase();
      if (letter === 'm' && !d[2]) throw new Error(`${current}: merge needs a target (m CLM-xxx)`);
      decisions.set(current, { letter, mergeTarget: d[2] ?? null });
      current = null;
    }
  }
  return decisions;
}

/**
 * R2-3 (round-2 review): a DECIDE line that is not one of the four letters used to vanish with NO
 * warning — `DECIDE: accept` or `DECIDE: yes` left the claim proposed and said nothing, so a human
 * could believe they had decided. The packet prints the legend on every line, but silence is still
 * the wrong answer to an unparseable instruction. Returns the offending lines for the caller to
 * report. Skipped lines (`DECIDE: _`) are the documented "no decision" marker and are NOT reported.
 * R3-2 (round-3 review): `DECIDE: m` with no target parses as a letter and so was NOT reported here,
 * yet `parseDecisions` throws on it — so the one input this function exists to catch was the one it
 * stayed quiet about, and adjudicate died with an uncaught stack trace (exit 1) instead of the
 * documented ⚠ / exit-5 interface. A bare `m` is now reported as unreadable here as well.
 */
export function unparsedDecideLines(packetText) {
  const out = [];
  let current = null;
  let n = 0;
  for (const line of String(packetText).split('\n')) {
    n += 1;
    const h = line.match(/^### (CLM-[A-Za-z0-9-]+)\b/);
    if (h) { current = h[1]; continue; }
    if (!/^DECIDE:/i.test(line)) continue;
    const body = line.replace(/^DECIDE:\s*/i, '').trim();
    if (body === '' || body === '_') continue;          // explicitly skipped — allowed
    const letter = body.match(/^([artm])\b/i);
    if (letter) {
      // a merge must name its target; `m` alone is unreadable, not a decision
      if (letter[1].toLowerCase() === 'm' && !/CLM-[A-Za-z0-9-]+/.test(body)) {
        out.push({ line: n, claimId: current, text: `${body} (merge needs a target: m CLM-xxx)` });
      }
      continue;
    }
    out.push({ line: n, claimId: current, text: body.split(/\s{2,}|\s*\(/)[0].trim() });
  }
  return out;
}

/**
 * Pure core: apply decisions → {imported, remainingProposed, targetUpdates, ignoredDecisions}.
 * Throws on bad merge targets.
 *
 * Hostile findings (2026-09-18):
 *  F4 — `m CLM-xxx` set a tombstone on the merged claim but never moved its EVIDENCE, so merging two
 *       single-source claims still produced a single-source claim and never lifted the LOW cap. A
 *       merge now absorbs products + receiptRefs into the target and recomputes confidence
 *       mechanically, reporting the change as `targetUpdates` (the target may live in claims.jsonl
 *       OR still be pending in claims-proposed.jsonl — the caller writes it back where it belongs).
 *  F1b — a letter aimed at an already-adjudicated claim was dropped SILENTLY. It is now reported as
 *       an ignored decision so "imported 0" can never mean "your input vanished".
 */
export function applyDecisions(proposed, existing, decisions, { actor, batchId, nowIso }) {
  const known = new Set([...existing, ...proposed].map((c) => c.claimId));
  const existingIds = new Set(existing.map((c) => c.claimId));
  const imported = [];
  const remaining = [];
  const targetUpdates = [];
  const ignoredDecisions = [];
  for (const c of proposed) {
    if (existingIds.has(c.claimId)) {
      // Idempotency: never re-import. But if a letter was written for it, say so out loud.
      if (decisions.has(c.claimId)) ignoredDecisions.push(c.claimId);
      continue;
    }
    const d = decisions.get(c.claimId);
    if (!d) { remaining.push(c); continue; }
    const out = { ...c, humanDecision: { actor, utc: nowIso, batchId } };
    if (d.letter === 'm') {
      if (!known.has(d.mergeTarget)) throw new Error(`${c.claimId}: merge target ${d.mergeTarget} does not exist`);
      const target = [...existing, ...proposed].find((x) => x.claimId === d.mergeTarget);
      if (target?.status === 'merged') throw new Error(`${c.claimId}: merge target ${d.mergeTarget} is itself merged — no chains`);
      out.status = 'merged';
      out.mergedInto = d.mergeTarget;
      if (target) {
        const products = [...new Set([...target.products, ...c.products])];
        const receiptRefs = [...new Set([...target.receiptRefs, ...c.receiptRefs])];
        targetUpdates.push({
          ...target,
          products,
          receiptRefs,
          confidence: confidenceFor(products),
          singleSource: products.length < 2,
          mergedFrom: [...new Set([...(target.mergedFrom ?? []), c.claimId])],
          rev: (target.rev ?? 1) + 1,
          updatedUtc: nowIso,
          humanDecision: { actor, utc: nowIso, batchId, note: `absorbed ${c.claimId}` },
        });
      }
    } else {
      out.status = LETTER_STATUS[d.letter];
    }
    imported.push(out);
  }
  return { imported, remainingProposed: remaining, targetUpdates, ignoredDecisions };
}

/** Regenerate INDEX.md — a derived view over claims.jsonl; the ledger is the asset. */
export function renderIndex(claims) {
  const by = (s) => claims.filter((c) => c.status === s);
  const lines = [
    '# Design-brain claims — index', '',
    '> Generated view — regenerate any time; `claims.jsonl` is the source of truth.', '',
    `accepted: ${by('accepted').length} · trial: ${by('trial').length} · rejected: ${by('rejected').length} · merged: ${by('merged').length}`, '',
  ];
  for (const status of ['accepted', 'trial']) {
    const set = by(status);
    if (!set.length) continue;
    lines.push(`## ${status}`, '');
    for (const c of set.sort((a, b) => a.domainId.localeCompare(b.domainId))) {
      lines.push(`- **${c.claimId}** [${c.domainId}, ${c.confidence.level}] ${c.principle.trim()} _(${c.products.join(', ')})_`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : undefined; };
  const root = resolveDataRoot(arg('root'));
  const actor = arg('actor') ?? 'sean';
  // Hostile finding F7: `resolve(arg('batch') ?? '')` returned the CWD, so this guard was
  // unreachable and an omitted --batch died with EISDIR instead of printing usage.
  const batchArg = arg('batch');
  if (!batchArg) {
    console.error('usage: adjudicate --root <root> --batch <BATCH-file> [--actor sean]');
    return 2;
  }
  const batchPath = resolve(batchArg);

  const batchText = readFileSync(batchPath, 'utf8');
  // R3-2 (round-3 review): a bare `DECIDE: m` (or any future hard parse error) used to escape as an
  // uncaught throw — a stack trace and exit 1, inconsistent with every other malformed input which
  // gets a named ⚠ and exit 5. Fail closed the same way, name the offending line, and say plainly
  // that nothing was applied.
  const unparsed = unparsedDecideLines(batchText);
  let decisions;
  try {
    decisions = parseDecisions(batchText);
  } catch (err) {
    console.error(`⚠ the batch could not be read: ${err.message}`);
    for (const u of unparsed) {
      console.error(`  line ${u.line} (${u.claimId ?? 'no claim header'}): "${u.text}" — use a=accept r=reject t=trial m CLM-xxx=merge`);
    }
    console.error('  nothing was applied — fix the line and re-run.');
    return 5;
  }
  const proposed = readJsonl(join(root, 'claims-proposed.jsonl'));
  const existing = loadClaims(join(root, 'claims.jsonl')); // fold: latest rev per claim (corroboration-aware)
  const nowIso = new Date().toISOString();
  const batchId = batchPath.replace(/\\/g, '/').split('/').pop();

  // R4-1 (round-4 review, found in round 3's own fix): the R3-2 try/catch covered the PARSE stage
  // only. `applyDecisions` throws for two further human-input errors — a merge target that does not
  // exist, and a merge chain — and those escaped as raw stack traces with exit 1, i.e. the exact
  // interface R3-2 was written to eliminate, one line below the fix. `applyDecisions` is pure, so a
  // throw here means nothing has been written yet and the "nothing was applied" promise is exact.
  let applied;
  try {
    applied = applyDecisions(proposed, existing, decisions, { actor, batchId, nowIso });
  } catch (err) {
    console.error(`⚠ the batch could not be applied: ${err.message}`);
    console.error('  nothing was applied — fix the line and re-run.');
    return 5;
  }
  const { imported, remainingProposed, targetUpdates, ignoredDecisions } = applied;
  for (const c of imported) appendJsonl(root, join(root, 'claims.jsonl'), c);

  // Merge absorption (F4): the surviving target may be a pending proposed row (rewrite in place) or
  // an already-ledgered claim (append rev+1 — the fold picks it up).
  const updateById = new Map(targetUpdates.map((c) => [c.claimId, c]));
  const remaining = remainingProposed.map((c) => updateById.get(c.claimId) ?? c);
  const pendingIds = new Set(remainingProposed.map((c) => c.claimId));
  for (const u of targetUpdates) {
    if (!pendingIds.has(u.claimId)) appendJsonl(root, join(root, 'claims.jsonl'), u);
  }

  safeWriteText(root, join(root, 'claims-proposed.jsonl'),
    remaining.map((c) => JSON.stringify(c)).join('\n') + (remaining.length ? '\n' : ''));

  const indexById = new Map([...existing, ...imported].map((c) => [c.claimId, c]));
  for (const u of targetUpdates) indexById.set(u.claimId, u);
  safeWriteText(root, join(root, 'INDEX.md'), renderIndex([...indexById.values()]));

  console.log(`imported ${imported.length} decision(s); ${remaining.length} still proposed`);
  if (targetUpdates.length) console.log(`merged evidence absorbed into ${targetUpdates.length} surviving claim(s)`);
  if (unparsed.length) {
    console.error(`⚠ ${unparsed.length} DECIDE line(s) could not be read — those claims stay proposed:`);
    for (const u of unparsed) console.error(`  line ${u.line} (${u.claimId ?? 'no claim header'}): "${u.text}" — use a=accept r=reject t=trial m CLM-xxx=merge`);
  }
  if (ignoredDecisions.length) {
    console.error(`⚠ IGNORED ${ignoredDecisions.length} letter(s) — already adjudicated, not re-importable:`);
    for (const id of ignoredDecisions) console.error(`  - ${id} (already in claims.jsonl; your letter was NOT applied)`);
    console.error('  These claims should not have been re-presented. Run packet again to refresh the batch.');
  }
  console.log(`INDEX.md regenerated. Accepted claims flow to the vault via: node src/emit-vault.mjs`);
  return (ignoredDecisions.length || unparsed.length) ? 5 : 0;
}

if (process.argv[1]?.endsWith('adjudicate.mjs')) process.exit(main());
