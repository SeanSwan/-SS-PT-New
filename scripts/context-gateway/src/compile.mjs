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
import { searchFiles, matchLines, basenameAffinity, findTests, searchCatalog, mergeWindows } from './retrieve.mjs';
import { createSafeReader, SafeReadError } from './safeRead.mjs';
import { createPacket } from './packet.mjs';
import { redactSecrets } from './egress.mjs';

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
 * @param {string} [opts.issueNotes]         compact Linear issue context (Phase 3): title/status/
 *                                           decisions fetched by the AGENT via the existing MCP
 *                                           OAuth — the gateway itself holds no Linear credential.
 *                                           Included as A3 evidence under a linear/ virtual path.
 */
export function compileContext({ root, question, tracked, originatingModel, issue = null, budgetChars = 48000, contextLines = 20, issueNotes = null }) {
  const { head, shaByPath } = gitState(root);
  const reader = createSafeReader({ root, tracked });
  const anchors = extractAnchors(question);
  // Precision rule (real-repo probe 2026-07-21): bare content words flood git grep on a
  // 12k-file repo (truncated hits, unrelated files) — when the question names anything
  // concrete (path/symbol/route/quoted), terms drive only the catalog lane, not code grep.
  const strong = [...anchors.paths, ...anchors.routes, ...anchors.quoted, ...anchors.symbols];
  const needles = strong.length ? strong : anchorNeedles(anchors);

  // --- retrieval v2 (benchmark-tuned 2026-07-21): complete file-level search first, so a
  // hit-line cap can never hide the named file; windows fetched only for ranked winners ---
  const notes = [];
  // Archives are reference-only (CLAUDE.md load order #7) and vendored trees are noise —
  // excluded from retrieval unless the question names the path explicitly (anchors.paths lane).
  const EXCLUDE_RE = /(^|\/)(archive|node_modules|venv|site-packages|dist|build|__pycache__)\//;
  const fileScore = new Map(); // path -> { needles:Set, affinity:boolean }
  for (const needle of needles.slice(0, 24)) {
    let files = searchFiles(root, needle).filter((p) => !EXCLUDE_RE.test(p));
    // A needle hitting hundreds of files can't discriminate by CONTENT — but a file NAMED
    // after it is still the strongest signal (bench: 'authMiddleware' hits 400+ importers,
    // yet authMiddleware.mjs itself is the ground truth). Common needles keep only their
    // basename matches; rare needles keep everything.
    const common = files.length > 400;
    if (common) {
      files = needle.length >= 6 ? files.filter((p) => basenameAffinity(p, needle)) : [];
      notes.push(`common needle "${needle}": basename matches only (${files.length})`);
    }
    for (const p of files) {
      if (!fileScore.has(p)) fileScore.set(p, { needles: new Set(), affinity: false });
      const s = fileScore.get(p);
      s.needles.add(needle);
      // Affinity only for discriminating needles — short generic words matching a basename
      // ('live' → live.py) must not dominate ranking.
      if (needle.length >= 6 && basenameAffinity(p, needle)) s.affinity = true;
    }
  }
  // explicit path anchors always enter, with affinity
  for (const p of anchors.paths) if (tracked.has(p)) {
    if (!fileScore.has(p)) fileScore.set(p, { needles: new Set(), affinity: true });
    fileScore.get(p).affinity = true;
  }
  // pre-read ranking: basename affinity dominates, then distinct-needle overlap
  const preRanked = [...fileScore.entries()]
    .map(([path, s]) => ({ path, score: (s.affinity ? 100 : 0) + s.needles.size * 10 }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 30);
  if (fileScore.size > 30) notes.push(`file candidates capped 30/${fileScore.size}`);

  const windowsByFile = new Map(); // path -> [{start,end,hits}]
  for (const { path } of preRanked) {
    const lines = matchLines(root, path, needles.slice(0, 24));
    const wins = lines.length
      ? lines.slice(0, 3).map((l) => ({ start: Math.max(1, l - contextLines), end: l + contextLines, hits: 1 }))
      : [{ start: 1, end: 2 * contextLines, hits: 1 }];
    windowsByFile.set(path, wins);
  }

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
    const density = (fileScore.get(path)?.affinity ? 100 : 0) + (fileScore.get(path)?.needles.size ?? 0) * 10 + wins.length;
    candidates.push({ path, windows: mergeWindows(wins), auth, density });
  }
  candidates.sort((a, b) => TIER_RANK[a.auth.tier] - TIER_RANK[b.auth.tier] || b.density - a.density || a.path.localeCompare(b.path));

  // --- budgeted packet assembly via safeRead ---
  const packet = createPacket({ question, headSha: head, originatingModel, issue });
  const included = [], excluded = [];
  let spent = 0, secretsRedacted = 0;
  // Linear issue context first (small, high-signal, A3 — a plan/status source, never code truth).
  // MUST redact like every other evidence lane: a Linear issue body is EXTERNAL content that could
  // hold a pasted secret (DB URL, key) — this lane bypassing egress was a T3 gap (hostile pass 4).
  if (issueNotes && issue) {
    // Redact BEFORE slicing (hostile pass 5, finding 5) so a secret straddling the 4000-char cut
    // can't survive as a truncated prefix; the redaction marker is shorter than any secret.
    const red = redactSecrets(String(issueNotes));
    red.text = red.text.slice(0, 4000);
    if (red.redactions) { secretsRedacted += red.redactions; notes.push(`redacted ${red.redactions} secret(s) [${red.kinds.join(',')}] in linear/${issue}.md`); }
    const content = red.text;
    const lineCount = content.split('\n').length;
    const id = packet.addEvidence({ path: `linear/${issue}.md`, startLine: 1, endLine: lineCount, content, sha: 'linear-live', tier: 'A3' });
    included.push({ id, path: `linear/${issue}.md`, window: `L1-L${lineCount}`, tier: 'A3' });
    spent += content.length;
  }
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
      // T3 content half: redact inline secret VALUES before the window can enter the packet — the
      // path filter cannot know a hardcoded key sits inside an innocuously-named tracked file.
      const red = redactSecrets(ev.content);
      if (red.redactions) { secretsRedacted += red.redactions; notes.push(`redacted ${red.redactions} secret(s) [${red.kinds.join(',')}] in ${ev.path}`); }
      if (spent + red.text.length > budgetChars) { excluded.push({ path: c.path, reason: 'BUDGET', window: `L${w.start}-L${w.end}` }); continue; }
      spent += red.text.length;
      const id = packet.addEvidence({ path: ev.path, startLine: ev.startLine, endLine: ev.endLine, content: red.text, sha: shaByPath.get(ev.path) ?? 'untracked', tier: c.auth.tier });
      included.push({ id, path: ev.path, window: `L${ev.startLine}-L${ev.endLine}`, tier: c.auth.tier });
    }
  }

  const manifest = packet.finalize();
  return { packet, manifest, report: { anchors, needleCount: needles.length, included, excluded, notes, spentChars: spent, budgetChars, headSha: head, secretsRedacted } };
}
