/**
 * compile.mjs — the dry-run context compiler (front half): question → immutable packet.
 * ======================================================================================
 * Pipeline (Phase 0 corrected architecture): anchors → catalog/code/test retrieval →
 * authority + supersession → safe-read windows → ranked, budgeted, immutable packet +
 * compile report. NO network, NO provider call, NO writes — $0 by construction.
 *
 * Ranking: authority tier first (A0 best), then match density. Superseded docs are
 * EXCLUDED (report says why); stale catalog rows contribute nothing (T6). The char
 * budget is enforced with an explicit `excluded` list — nothing is silently dropped.
 *
 * @module context-gateway/compile
 */
import { execFileSync } from 'node:child_process';
import { extractAnchors, anchorNeedles } from './anchors.mjs';
import { parseCatalog, resolveAuthority, TIER_RANK } from './authority.mjs';
import { searchCode, findTests, searchCatalog, mergeWindows } from './retrieve.mjs';
import { createSafeReader, SafeReadError } from './safeRead.mjs';
import { createPacket } from './packet.mjs';

const HANDOFF = 'docs/ai-workflow/AI-HANDOFF/';

/** blob sha12 map + HEAD for provenance/freshness. */
function gitState(root) {
  const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString('utf8').trim();
  const shaByPath = new Map();
  const out = execFileSync('git', ['-C', root, 'ls-files', '-s'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  for (const line of out.split('\n')) {
    const m = line.match(/^\d+ ([0-9a-f]{40}) \d\t(.+)$/);
    if (m) shaByPath.set(m[2].replaceAll('\\', '/'), m[1].slice(0, 12));
  }
  return { head, shaByPath };
}

/**
 * Compile a question into an immutable context packet. Dry-run only.
 * @param {object} opts
 * @param {string} opts.root                 repo checkout root
 * @param {string} opts.question
 * @param {Set<string>} opts.tracked         git ls-files universe
 * @param {string} opts.originatingModel     Rule 68 provenance stamp
 * @param {string} [opts.issue]
 * @param {number} [opts.budgetChars=48000]  total evidence budget (~12k tokens)
 * @param {number} [opts.contextLines=20]    window radius around each code hit
 */
export function compileContext({ root, question, tracked, originatingModel, issue = null, budgetChars = 48000, contextLines = 20 }) {
  const { head, shaByPath } = gitState(root);
  const reader = createSafeReader({ root, tracked });
  const anchors = extractAnchors(question);
  // Precision rule (real-repo probe 2026-07-21): bare content words flood git grep on a
  // 12k-file repo (truncated hits, unrelated files) — when the question names anything
  // concrete (path/symbol/route/quoted), terms drive only the catalog lane, not code grep.
  const strong = [...anchors.paths, ...anchors.routes, ...anchors.quoted, ...anchors.symbols];
  const needles = strong.length ? strong : anchorNeedles(anchors);

  // --- retrieval: code hits per needle, windows merged per file ---
  const windowsByFile = new Map(); // path -> [{start,end,hits}]
  const notes = [];
  for (const needle of needles.slice(0, 24)) {
    const { hits, truncated } = searchCode(root, needle);
    if (truncated) notes.push(`grep truncated for needle "${needle}"`);
    for (const h of hits) {
      if (!windowsByFile.has(h.path)) windowsByFile.set(h.path, []);
      windowsByFile.get(h.path).push({ start: Math.max(1, h.line - contextLines), end: h.line + contextLines, hits: 1 });
    }
  }
  // explicit path anchors: include head-of-file even without grep hits
  for (const p of anchors.paths) if (tracked.has(p) && !windowsByFile.has(p)) windowsByFile.set(p, [{ start: 1, end: 2 * contextLines, hits: 1 }]);

  // --- catalog lane (A4 pointers -> open the source docs) ---
  const catalogText = tracked.has('docs/ai-workflow/CATALOG.md') ? reader.readWindow('docs/ai-workflow/CATALOG.md').content : '';
  const catalog = parseCatalog(catalogText);
  const { rows } = searchCatalog(catalog, [...anchors.terms, ...anchors.symbols, ...anchors.quoted]);
  for (const { file } of rows) {
    const p = HANDOFF + file;
    if (tracked.has(p) && !windowsByFile.has(p)) windowsByFile.set(p, [{ start: 1, end: 60, hits: 1 }]);
  }

  // --- sibling tests for the top code files ---
  for (const p of [...windowsByFile.keys()].filter((f) => /\.(mjs|cjs|js|jsx|ts|tsx|py)$/.test(f)).slice(0, 10)) {
    for (const t of findTests(p, tracked)) if (!windowsByFile.has(t)) windowsByFile.set(t, [{ start: 1, end: 2 * contextLines, hits: 1 }]);
  }

  // --- authority + ranking ---
  const candidates = [];
  for (const [path, wins] of windowsByFile) {
    const auth = resolveAuthority(path, catalog, shaByPath);
    const density = wins.reduce((n, w) => n + w.hits, 0);
    candidates.push({ path, windows: mergeWindows(wins), auth, density });
  }
  candidates.sort((a, b) => TIER_RANK[a.auth.tier] - TIER_RANK[b.auth.tier] || b.density - a.density || a.path.localeCompare(b.path));

  // --- budgeted packet assembly via safeRead ---
  const packet = createPacket({ question, headSha: head, originatingModel, issue });
  const included = [], excluded = [];
  let spent = 0;
  for (const c of candidates) {
    if (c.auth.superseded) { excluded.push({ path: c.path, reason: 'SUPERSEDED' }); continue; }
    if (c.auth.stale) notes.push(`stale catalog row ignored for ${c.path}`);
    for (const w of c.windows) {
      let ev;
      try { ev = reader.readWindow(c.path, w.start, w.end); }
      catch (e) {
        if (e instanceof SafeReadError && e.code === 'BAD_RANGE') { try { ev = reader.readWindow(c.path); } catch (e2) { excluded.push({ path: c.path, reason: e2.code }); continue; } }
        else { excluded.push({ path: c.path, reason: e.code ?? 'READ_ERROR' }); continue; }
      }
      if (spent + ev.content.length > budgetChars) { excluded.push({ path: c.path, reason: 'BUDGET', window: `L${w.start}-L${w.end}` }); continue; }
      spent += ev.content.length;
      const id = packet.addEvidence({ path: ev.path, startLine: ev.startLine, endLine: ev.endLine, content: ev.content, sha: shaByPath.get(ev.path) ?? 'untracked', tier: c.auth.tier });
      included.push({ id, path: ev.path, window: `L${ev.startLine}-L${ev.endLine}`, tier: c.auth.tier });
    }
  }

  const manifest = packet.finalize();
  return { packet, manifest, report: { anchors, needleCount: needles.length, included, excluded, notes, spentChars: spent, budgetChars, headSha: head } };
}
