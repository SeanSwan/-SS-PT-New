/**
 * GLM's decisive measurement: are persisted plan docs ever re-read after they are written?
 *
 * Method
 *   1. Every tracked .md under AI-HANDOFF/ and brainstorms/, with its git creation date,
 *      from ONE `git log --diff-filter=A --name-only` pass.
 *   2. Stream every session transcript once. Extract .md basenames per line, look each up.
 *   3. A doc counts as RE-READ if a read-shaped mention occurs >24h after its creation.
 *      The 24h window excludes same-session authoring churn, which is not a re-read.
 *
 * Honest limits — the conclusion depends on these, so they are stated, not buried:
 *   - Basename matching. Docs whose basename is ambiguous across paths are EXCLUDED, not guessed.
 *   - A line carrying any write-signal is classified WRITE, even if it also reads. This
 *     UNDERCOUNTS reads — so a low re-read rate is not an artifact of this choice, though a
 *     high one could be.
 *   - Prose mentions with no read verb are counted separately as WEAK, never as reads.
 *   - Transcripts cover only sessions retained on this machine. Reads by Codex, Hermes, or
 *     any agent whose transcripts live elsewhere are invisible here.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';

// Portable: repo from CLAUDE_PROJECT_DIR (set by hooks) or cwd; transcript dir derived
// from the repo path the way Claude Code encodes it, overridable via SWAN_TRANSCRIPT_DIR.
const REPO = (process.env.CLAUDE_PROJECT_DIR || process.cwd()).split('\\').join('/');
const TDIR = process.env.SWAN_TRANSCRIPT_DIR || (() => {
  const home = (process.env.USERPROFILE || process.env.HOME || '').split('\\').join('/');
  const slug = REPO.split(':').join('').split('/').join('-');
  return home + '/.claude/projects/' + slug;
})();
if (!fs.existsSync(TDIR)) {
  console.error('transcript dir not found: ' + TDIR);
  console.error('set SWAN_TRANSCRIPT_DIR to the session-transcript folder and re-run.');
  process.exit(2);
}
const DIRS = ['docs/ai-workflow/AI-HANDOFF', 'docs/ai-workflow/brainstorms'];
const NL = String.fromCharCode(10);

// ---- 1. inventory + creation dates, one git pass ------------------------------------
const docs = new Map();
const dupes = new Set();
{
  const out = execFileSync(
    'git',
    ['-C', REPO, 'log', '--diff-filter=A', '--format=@%aI', '--name-only', '--', ...DIRS],
    { encoding: 'utf8', maxBuffer: 1 << 30 },
  );
  let cur = null;
  for (const raw of out.split(NL)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('@')) { cur = Date.parse(line.slice(1)); continue; }
    if (!line.endsWith('.md')) continue;
    if (!DIRS.some((d) => line.startsWith(d))) continue;
    const base = path.basename(line);
    const rec = docs.get(base);
    if (rec) {
      if (rec.rel !== line) { dupes.add(base); continue; }
      if (cur && cur < rec.created) rec.created = cur; // git walks newest-first
      continue;
    }
    if (cur) docs.set(base, { rel: line, created: cur, reads: 0, weak: 0, writes: 0 });
  }
}
for (const b of dupes) docs.delete(b);
console.log(`docs inventoried: ${docs.size}   (excluded ${dupes.size} ambiguous basenames)`);

// ---- 2. stream transcripts -----------------------------------------------------------
const WRITE_SIG = /"name":"(Write|Edit|NotebookEdit)"|git add|>>?\s*["']?[^"'\s]*\.md|cat\s*>|\btee\b/;
const READ_SIG = /"name":"(Read|Grep)"|\bcat\b|\bsed -n\b|\bhead\b|\btail\b|\bgrep\b|\brg\b|\bawk\b|\bless\b/;
const BASENAME = /[A-Za-z0-9._-]+\.md/g;

const files = fs.readdirSync(TDIR).filter((f) => f.endsWith('.jsonl'));
let lines = 0, hits = 0;
for (const f of files) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(TDIR, f), { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let ts = null;
  for await (const line of rl) {
    lines++;
    const tsm = line.match(/"timestamp":"([^"]+)"/);
    if (tsm) ts = Date.parse(tsm[1]);
    if (!line.includes('.md')) continue;
    const found = line.match(BASENAME);
    if (!found) continue;
    let isWrite = null, isRead = null;
    for (const base of new Set(found)) {
      const rec = docs.get(base);
      if (!rec) continue;
      hits++;
      if (isWrite === null) { isWrite = WRITE_SIG.test(line); isRead = READ_SIG.test(line); }
      if (isWrite) { rec.writes++; continue; }
      if (ts && ts > rec.created + 86400000) {
        if (isRead) rec.reads++; else rec.weak++;
      }
    }
  }
}

// ---- 3. report -------------------------------------------------------------------------
const all = [...docs.values()];
const reread = all.filter((d) => d.reads > 0);
const weakOnly = all.filter((d) => d.reads === 0 && d.weak > 0);
const never = all.filter((d) => d.reads === 0 && d.weak === 0);
const pct = (n) => `${((100 * n) / all.length).toFixed(1)}%`;

console.log(`transcript lines: ${lines.toLocaleString()}   basename hits: ${hits.toLocaleString()}`);
console.log('');
console.log(`docs measured:                ${all.length}`);
console.log(`RE-READ  >24h after creation: ${reread.length}  (${pct(reread.length)})`);
console.log(`mentioned, no read verb:      ${weakOnly.length}  (${pct(weakOnly.length)})`);
console.log(`NEVER touched again:          ${never.length}  (${pct(never.length)})`);
console.log('');
const totalReads = all.reduce((a, d) => a + d.reads, 0);
console.log(`total post-creation reads: ${totalReads}   mean ${(totalReads / all.length).toFixed(2)} per doc`);
console.log('');
console.log('POSITIVE CONTROL - the most re-read docs. If this list is empty or absurd,');
console.log('the instrument is broken and the headline number means nothing:');
for (const d of reread.sort((a, b) => b.reads - a.reads).slice(0, 10)) {
  console.log(`  ${String(d.reads).padStart(4)}  ${d.rel}`);
}

// ---- 4. THE DECISIVE CUT: does document CLASS predict re-reading? -------------------
const classify = (rel) => {
  const b = rel.split("/").pop().toUpperCase();
  if (/PLAN|BLUEPRINT|DIRECTIVE|SLICE|PHASE|ROADMAP|IMPLEMENTATION|SPEC/.test(b)) return "blueprint (implementation plan)";
  if (/VISION|BRAINSTORM|STRATEGY|RULING|DECISION|CHARTER|VALUES|PRINCIPLE/.test(b)) return "direction (vision/decision)";
  if (/AUDIT|REVIEW|PANEL|DEBATE|CONSULT|FINDING/.test(b)) return "review artifact";
  if (/HANDOFF|CONTINUITY|CLOSEOUT|SESSION/.test(b)) return "handoff/closeout";
  return "other";
};
const groups = new Map();
for (const d of all) {
  const k = classify(d.rel);
  if (!groups.has(k)) groups.set(k, { n: 0, reread: 0, reads: 0 });
  const g = groups.get(k);
  g.n++; g.reads += d.reads; if (d.reads > 0) g.reread++;
}
console.log("");
console.log("RE-READ RATE BY DOCUMENT CLASS — the cut that decides the doctrine:");
console.log("");
console.log("  class                            n    re-read   rate    mean/doc  ex-outlier  top1");
const rows = [...groups.entries()].sort((a,b) => (b[1].reread/b[1].n) - (a[1].reread/a[1].n));
for (const [k, g] of rows) {
  const top = Math.max(...all.filter(d=>classify(d.rel)===k).map(d=>d.reads), 0);
  const exTop = (g.reads - top) / Math.max(g.n - 1, 1);
  console.log("  " + k.padEnd(32) + String(g.n).padStart(4) + String(g.reread).padStart(9)
    + (100*g.reread/g.n).toFixed(1).padStart(8) + "%" + (g.reads/g.n).toFixed(2).padStart(10)
    + exTop.toFixed(2).padStart(12) + String(top).padStart(8));
}
