/**
 * provenance.mjs — R3, the check that makes hand-typed code impossible to send.
 * =============================================================================
 * Split out of checks.mjs for the 300-line cap (CLAUDE.md rule 4). Nothing here changed in the
 * split: it is the same code, moved, so that the file holding the gate's single most load-bearing
 * check can be read end to end.
 *
 * R3 is the check the whole design rests on. Every cited block must byte-match a fresh re-extraction
 * from the repo, so a block that claims `path=` and then disagrees with the file is either stale
 * (the file moved on) or invented (someone typed it from memory). The gate cannot tell which, so it
 * refuses and shows the operator both sides.
 *
 * Pure by construction: the file reader is injected, so the canary suite can drive this red.
 *
 * @module packet-gate/provenance
 */
import { finding } from './refusal.mjs';
import { normalizeEol } from './normalize.mjs';
import { blockWhere } from './fences.mjs';

/** Normalize for byte-comparison: line endings folded and one trailing newline dropped. Windows
 *  checkouts and editors differ on both, and neither difference means someone retyped the code. */
const norm = (s) => normalizeEol(s).replace(/\n$/, '');

/** Parse `lines=40-118` (or `lines=40`). Returns null when absent/malformed. */
function parseRange(spec) {
  if (!spec) return null;
  const m = /^(\d+)(?:-(\d+))?$/.exec(String(spec).trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : start;
  return end < start || start < 1 ? null : { start, end };
}

/** Reject a cited path before it is ever read. `path=""` resolved to the repo ROOT and threw an
 *  uncaught EISDIR — a stack trace instead of a refusal, which is the least diagnosable failure a
 *  gate can produce. `path=../../.env` escaped the repo entirely and would have been read and
 *  diffed. Both found by Kimi K3, 2026-08-14. Lexical check, so it stays pure. */
function badPath(p) {
  if (typeof p !== 'string' || p.trim() === '') return 'empty path';
  const n = p.replaceAll('\\', '/');
  if (/^([A-Za-z]:)?\//.test(n)) return 'absolute path';
  if (n.split('/').includes('..')) return 'path escapes the repo (..)';
  // A LEADING `:` IS GIT PATHSPEC MAGIC, and `--` does not stop it — `--` ends OPTION parsing only.
  //
  // Round 8 closed the self-citation class by requiring cited files to be tracked. Round 9 defeated
  // that through the check itself: on POSIX, `:` and `*` are legal filename characters, so
  // `cp packet.md ':(glob)**'` creates a real file whose NAME is a pathspec. existsSync passes (the
  // file is right there), and `git ls-files --error-unmatch -- ':(glob)**'` then EXPANDS the magic
  // and matches every tracked file in the repo — exit 0, "tracked" — while readFileSync reads the
  // untracked copy, which byte-matches the fabricated fence by construction. The round-7/8 critical
  // reproduced straight through its own fix, with one command and no commit. (Kimi K3 round 9, F1.)
  //
  // Rejected lexically here, before any git or fs call, and belt-and-braces with
  // GIT_LITERAL_PATHSPECS=1 in repo-io — because this is the third round in which an author-supplied
  // string reached a tool that interprets rather than matches it.
  if (n.startsWith(':')) return 'path begins with ":" (git pathspec magic)';
  return null;
}

/**
 * Every cited block must byte-match a fresh re-extraction from the repo.
 *
 * @param {object[]} blocks   from parseFences
 * @param {(p:string)=>string|null} readFile  injected reader; null => file absent
 */
export function checkProvenance(blocks, readFile) {
  const out = [];
  for (const b of blocks.filter((x) => x.cited)) {
    const bad = badPath(b.attrs.path);
    if (bad) {
      out.push(finding('R3', `block at ${blockWhere(b)} cites an unusable path (${bad}): ${JSON.stringify(b.attrs.path)}`,
        'cite a repo-relative path inside the repository'));
      continue;
    }
    // The injected reader touches the filesystem and can throw (EISDIR on a directory, EACCES,
    // a FIFO). An I/O error is a refusal with a reason, never an uncaught stack trace.
    let src;
    try {
      src = readFile(b.attrs.path);
    } catch (err) {
      // ESELFCITE gets its own remedy: "cite a readable file" is nonsense advice for a packet that
      // cited itself, and an undiagnosable refusal is one the operator routes around.
      const SPECIFIC = {
        ESELFCITE: ['that is this packet (or its seed)',
          'cite the real source file. A packet citing itself byte-matches by construction, so it proves nothing'],
        EUNTRACKED: ['it is not tracked by git',
          'commit the file first, or use --allow-uncited. An untracked scratch copy byte-matches itself and proves nothing'],
        ESUBMODULE: ['it lives inside a submodule, which the superproject tracks only as a gitlink',
          'cite a file in this repository, or attach the excerpt with --allow-uncited and say where it came from'],
        ESTAGED: ['it is staged but never committed — staging is not provenance',
          'commit the file, or use --allow-uncited. `git add` is a local act by the same author writing the packet'],
      }[err.code];
      out.push(SPECIFIC
        ? finding('R3', `block at ${blockWhere(b)} cites ${b.attrs.path} — ${SPECIFIC[0]}`, SPECIFIC[1])
        : finding('R3', `block at ${blockWhere(b)} cites ${b.attrs.path} — cannot read it (${err.code ?? err.message})`,
          'cite a readable file; the packet claims provenance the gate cannot verify'));
      continue;
    }
    if (src == null) {
      out.push(finding('R3', `block at ${blockWhere(b)} cites ${b.attrs.path} — file not found in repo`,
        'correct the path, or drop the block: the packet claims provenance it cannot prove'));
      continue;
    }
    const all = norm(src).split('\n');
    // `lines=` OMITTED means the whole file. Requiring it refused an author who correctly cited
    // `path=foo.mjs` and simply wanted to quote all of it — a pointless refusal with no syntax for
    // "whole file" (HY3 round 3, finding 4). This is STRICTER, not weaker: the block is now
    // byte-checked against the entire file, so any drift anywhere in it is caught.
    // A MALFORMED lines= is still refused — a typo must never silently widen the range.
    const range = b.attrs.lines === undefined ? { start: 1, end: all.length } : parseRange(b.attrs.lines);
    if (!range) {
      out.push(finding('R3', `block at ${blockWhere(b)} cites ${b.attrs.path} with a malformed lines= value (${JSON.stringify(b.attrs.lines)})`,
        'use lines=<start>-<end>, or omit lines= entirely to cite the whole file'));
      continue;
    }
    if (range.end > all.length) {
      out.push(finding('R3', `block at ${blockWhere(b)} cites ${b.attrs.path} L${range.start}-${range.end}, but the file has ${all.length} lines`,
        're-extract at the current commit — the anchor is stale'));
      continue;
    }
    // Normalize BOTH sides identically. Normalizing only the packet body made the comparison
    // asymmetric: a file whose cited range ends on a trailing blank line produced an `expected`
    // ending in "\n" that the body could never match, so R3 refused every full-file citation of such
    // a file. Found by running the packet BUILDER's own output through the gate: it refused a
    // byte-exact extraction it had just produced. (Round 4 re-tested the symmetry and confirmed a
    // range ending in MULTIPLE blank lines matches — see the NOT-A-BUG PIN in the test suite.)
    const expected = norm(all.slice(range.start - 1, range.end).join('\n'));
    if (norm(b.body) !== expected) {
      out.push(finding('R3', `block at ${blockWhere(b)} does not match ${b.attrs.path} L${range.start}-${range.end} (${firstDivergence(norm(b.body), expected)})`,
        're-extract verbatim; never retype. Someone hand-typed or hand-"improved" this code'));
    }
  }
  return out;
}

/** Report the first differing line so a refusal is diagnosable in 30 seconds — an undiagnosable
 *  refusal becomes an ignored refusal (blueprint §5 item 3, refusal fatigue). */
function firstDivergence(got, want) {
  const g = got.split('\n');
  const w = want.split('\n');
  for (let i = 0; i < Math.max(g.length, w.length); i += 1) {
    if (g[i] !== w[i]) return `first divergence at block line ${i + 1}: packet ${JSON.stringify((g[i] ?? '<missing>').slice(0, 60))} vs repo ${JSON.stringify((w[i] ?? '<missing>').slice(0, 60))}`;
  }
  return 'lengths differ';
}
