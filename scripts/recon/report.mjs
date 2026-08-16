/**
 * recon/report.mjs -- the artifact the owner reads.
 *
 * Information design adopted from the HY3 panel design (it won that category):
 * group by ACTION not by branch, priority-ordered, markers for 60-second scan,
 * and negative confirmation ("no unpushed changes here") treated as a finding.
 *
 * LANGUAGE RULE (all three panel models converged): never print "safe to
 * merge". Print "no detected regression" and show the evidence. A checkmark
 * displaces the vigilance a scary unknown would have provoked.
 */

// pathSensitivity is IMPORTED, never re-implemented. Two inline regex copies
// previously drifted from the canonical SENSITIVE list, so the AUDIT DELTA
// could print "NO unpushed changes in sensitive paths" for a branch the
// sensitivity floor had already escalated. Single source of truth.
import { VERDICT, pathSensitivity } from './rank.mjs';
import { EQUIV } from './equivalence.mjs';

const MARK = {
  [VERDICT.LANDED]: '[ARCHIVE]',
  [VERDICT.SUPERSEDED]: '[ARCHIVE]',
  [VERDICT.COST]: '[ARCHIVE]',
  [VERDICT.EXPERIMENTAL]: '[PARK]',
  [VERDICT.WIP]: '[PARK]',
  [VERDICT.UPGRADE]: '[PUSH]',
  [VERDICT.REGRESSION_RISK]: '[RISK]',
  [VERDICT.CONFLICTING]: '[HUMAN]',
  [VERDICT.UNKNOWN]: '[HUMAN]',
  [VERDICT.ACTIVE_LANE]: '[IN-FLIGHT]',
};

function age(ts) {
  if (!ts) return '?';
  const d = Math.floor(Date.now() / 1000 - ts) / 86400;
  if (d < 1) return `${Math.max(1, Math.round(d * 24))}h`;
  if (d < 14) return `${Math.round(d)}d`;
  return `${Math.round(d / 7)}w`;
}

const line = (c = '=') => c.repeat(78);

export function renderReport(state) {
  const { base, baseSha, items, notExamined, workingTree, startedAt, durationMs, deepCount } = state;
  const out = [];

  const byVerdict = new Map();
  for (const it of items) {
    const v = it.verdict ?? VERDICT.UNKNOWN;
    if (!byVerdict.has(v)) byVerdict.set(v, []);
    byVerdict.get(v).push(it);
  }
  const g = (v) => byVerdict.get(v) ?? [];

  const landed = g(VERDICT.LANDED);
  const decisions = [
    ...g(VERDICT.REGRESSION_RISK), ...g(VERDICT.CONFLICTING),
    ...g(VERDICT.UPGRADE), ...g(VERDICT.WIP), ...g(VERDICT.COST),
  ];
  const unknowns = g(VERDICT.UNKNOWN);
  const inFlight = g(VERDICT.ACTIVE_LANE);

  // Trap correction stats -- the single most persuasive number in the report.
  let inflated = 0;
  let claimedAhead = 0;
  let realAhead = 0;
  for (const it of items) {
    const ua = it.item.untrustedAhead;
    if (ua != null && ua > 0) {
      claimedAhead += ua;
      realAhead += it.rec.realCommits ?? 0;
      if ((it.rec.realCommits ?? 0) < ua) inflated++;
    }
  }

  out.push(line());
  out.push(` RECON — pre-audit reconciliation      ${new Date(startedAt).toISOString().slice(0, 16).replace('T', ' ')}`);
  out.push(` base: ${base} @ ${(baseSha ?? '?').slice(0, 8)}   ·   ${items.length} refs swept in ${(durationMs / 1000).toFixed(1)}s`);
  out.push(line('-'));
  out.push('');
  // "zero risk to retire" was a safety claim the engine has not established --
  // it proves shipped-ness, not safety, and the language rule forbids implying
  // otherwise. [HUMAN] also counted the whole decision list, which includes
  // [ARCHIVE]/[PARK] rows that need no decision.
  const needsHuman = decisions.filter(
    (it) => MARK[it.verdict] === '[HUMAN]' || MARK[it.verdict] === '[RISK]' || MARK[it.verdict] === '[PUSH]',
  ).length;
  out.push(' DECISION SUMMARY (read this first)');
  out.push(`   [ARCHIVE]  ${landed.length} branches whose content is already on ${base}`);
  out.push(`   [HUMAN]    ${needsHuman} need your call   ·   [IN-FLIGHT] ${inFlight.length} active, untouched`);
  out.push(`   [?]        ${unknowns.length} unresolved — evidence insufficient, NOT assumed safe`);
  out.push('');

  if (claimedAhead > 0) {
    out.push(` ⚠ COMMIT-COUNT CORRECTION`);
    out.push(`   git reported ${claimedAhead} "ahead" commits across ${inflated} branches.`);
    out.push(`   Measured against ${base}: ${realAhead} are genuinely absent.`);
    out.push(`   The rest already shipped. Never trust "ahead N" — it measures the`);
    out.push(`   branch's own remote, not ${base}.`);
    out.push('');
  }

  if (decisions.length) {
    out.push(` WHAT TO DO (priority order)`);
    decisions.slice(0, 12).forEach((it, i) => {
      const r = it.rec;
      const ua = it.item.untrustedAhead;
      const correction = ua != null && ua !== (r.realCommits ?? 0)
        ? `reported ahead ${ua} → ${r.realCommits ?? '?'} real` : `${r.realCommits ?? '?'} real commits`;
      out.push(`  ${i + 1}. ${MARK[it.verdict]} ${it.item.ref}`);
      out.push(`       ${correction} · ${age(it.item.lastCommitAt)} old · behind ${r.behind ?? '?'} · ${r.fileCount} files`);
      out.push(`       verdict: ${it.verdict} (${r.confidence} confidence)`);
      out.push(`       signals: ${r.signals.join(', ')}`);
    });
    out.push('');
  }

  if (landed.length) {
    out.push(` ALREADY LANDED — archive-tag candidates (${landed.length})`);
    landed.slice(0, 8).forEach((it) => {
      const ua = it.item.untrustedAhead;
      const note = ua ? ` (reported ahead ${ua} → 0 real)` : '';
      out.push(`   ${it.item.ref}${note}`);
    });
    if (landed.length > 8) out.push(`   + ${landed.length - 8} more  [--full to list]`);
    out.push('');
  }

  out.push(` AUDIT DELTA — what an audit of ${base} will NOT see`);
  // Computed over EVERY non-landed item, not just the ones that made the
  // decision list. Scoping this to `decisions` produced a "covers those
  // surfaces completely" claim while ignoring every deferred and unknown
  // branch -- a coverage claim computed over the wrong population.
  const nonLanded = items.filter((it) => it.rec.equivalence !== EQUIV.LANDED);
  const unresolved = nonLanded.filter(
    (it) => it.rec.filesUnknown || it.verdict === VERDICT.UNKNOWN
      || it.rec.contentCheck?.truncated || it.rec.contentCheck?.failed,
  );
  const risky = nonLanded.filter((it) => pathSensitivity(it.rec.files ?? []) > 0);

  if (risky.length === 0 && unresolved.length === 0) {
    out.push(`   Sensitive paths: NO unpushed changes detected across all ${nonLanded.length} non-landed refs.`);
  } else if (risky.length === 0) {
    out.push(`   No sensitive unpushed changes found in the ${nonLanded.length - unresolved.length} refs`);
    out.push(`   we could fully inspect. ${unresolved.length} refs could NOT be inspected —`);
    out.push(`   coverage of sensitive surfaces is therefore NOT established.`);
  } else {
    for (const it of risky.slice(0, 6)) {
      const files = (it.rec.files ?? []).filter((f) => pathSensitivity([f]) > 0);
      out.push(`   ⚠ ${it.item.ref}: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` +${files.length - 3}` : ''}`);
    }
  }
  if (workingTree?.statusFailed) {
    out.push(`   ⚠ WORKING TREE STATE UNKNOWN — git status could not be read.`);
    out.push(`   ⚠ Uncommitted work may exist and is NOT accounted for below.`);
  } else if (workingTree?.dirty) {
    out.push(`   Working tree: ${workingTree.fileCount} uncommitted files NOT audited`
      + (workingTree.untrackedCount != null ? ` (${workingTree.untrackedCount} untracked)` : ''));
    const st = workingTree.snapshotStatus ?? 'unknown';
    if (st === 'ok') {
      out.push(`     snapshot: ${workingTree.snapshotSha.slice(0, 10)} (dangling commit; tree untouched)`);
    } else if (st.startsWith('FAILED')) {
      // Loud on purpose: a preservation failure rendered as silence is how
      // "we have a backup" becomes false.
      out.push(`     ⚠ SNAPSHOT ${st}`);
      out.push(`     ⚠ NO preservation pointer exists for these files.`);
    } else {
      out.push(`     snapshot: ${st}`);
    }
    out.push(`     top dirs: ${workingTree.dirs.slice(0, 4).map((d) => `${d.dir}(${d.n})`).join(' ')}`);
  }
  out.push('');

  out.push(` NOT EXAMINED (honest scope)`);
  for (const n of notExamined) out.push(`   · ${n}`);
  out.push(`   · deep pass ran on top ${deepCount} by rank only`);
  out.push('');
  out.push(' NOTE: no verdict here authorises a merge. "genuine-upgrade" requires the');
  out.push('       Phase-3 evidence pass. This run reports shipped-ness, not safety.');
  out.push(line());
  return out.join('\n');
}

export function renderJson(state) {
  return JSON.stringify({
    base: state.base,
    baseSha: state.baseSha,
    startedAt: state.startedAt,
    durationMs: state.durationMs,
    deepCount: state.deepCount,
    notExamined: state.notExamined,
    workingTree: state.workingTree,
    items: state.items.map((it) => ({
      ref: it.item.ref,
      kind: it.item.kind,
      tip: it.item.tip,
      lastCommitAt: it.item.lastCommitAt,
      untrustedAhead: it.item.untrustedAhead,
      laneLocked: it.item.laneLocked ?? false,
      inWorktree: it.item.inWorktree ?? false,
      equivalence: it.rec.equivalence,
      confidence: it.rec.confidence,
      realCommits: it.rec.realCommits,
      ahead: it.rec.ahead,
      behind: it.rec.behind,
      fileCount: it.rec.fileCount,
      signals: it.rec.signals,
      verdict: it.verdict,
      score: it.score,
      error: it.rec.error,
    })),
  }, null, 2);
}
