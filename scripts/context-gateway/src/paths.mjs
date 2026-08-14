/**
 * paths.mjs — ONE escape predicate for "does this path leave the directory I am reporting against?"
 * ==================================================================================================
 * WHY THIS MODULE EXISTS: the same threat — a filesystem path carrying the OS username into a
 * transcript, a persisted artifact, or an external prompt (Rule 8/59) — was being answered by two
 * helpers with two different policies, in two files:
 *
 *   consult.mjs  shortPath()       checked `r === '..' || r.startsWith('..' + sep)`  (precise)
 *   receiptV1.mjs relativizePath() checked `rel.startsWith('..')`                    (blunt)
 *
 * The blunt one over-redacts a legitimate in-repo sibling named `..foo/` to `<external>`; the
 * precise one does not. Neither was wrong enough to break, but two policies for one threat is how
 * the next fix lands in only one of them — which is the exact failure this whole review chain kept
 * hitting (a fix closes the instance and the class survives one file over). One predicate now.
 *
 * SECURITY NOTE: `escapesFrom` is deliberately conservative — it answers "could this path be outside
 * `from`", and callers redact when it returns true. A false positive costs a little display detail;
 * a false negative leaks a username. When in doubt it must return true.
 *
 * @module context-gateway/paths
 */
import { relative, resolve, isAbsolute, sep } from 'node:path';
import { homedir } from 'node:os';

/**
 * True when `rel` (already the output of `relative()`) points outside its base.
 * Two escape shapes, and BOTH must be checked — missing either is a leak:
 *   - absolute  : Windows cross-drive, where relative() cannot express the hop and returns `D:\...`
 *   - `..`-lead : the ordinary case on every platform, e.g. `../../Users/<name>/out.md`
 * A path merely STARTING with the characters `..` (`..foo/bar`) is NOT an escape — it is a sibling
 * whose name begins with dots, and redacting it would lose real information for no safety gain.
 */
/**
 * Drive-qualified (`C:\…`, `D:/…`) is absolute on win32 but reads as an ordinary FILENAME on POSIX,
 * where `isAbsolute` returns false. Without this, `relativizePath('/repo','C:/Users/<name>/x.md')`
 * resolves to `/repo/C:/Users/<name>/x.md`, relativizes back to `C:/Users/<name>/x.md`, escapes()
 * says false — and the receipt records the OS username VERBATIM. A username does not stop being PII
 * because the runtime stopped recognising the path shape, so redaction must be platform-independent
 * even though `isAbsolute` is not. Proven with path.posix: leaked on Linux/macOS/WSL, invisible on
 * Windows — which is why 15 review rounds on a Windows box never saw it (Kimi round 16, S1).
 *
 * THREE Windows-absolute shapes, not one. The first fix caught only drive-qualified paths, so a
 * UNC share (`\\fileserver\share\<name>\x.md` — leaks the SERVER name as well as the username) and
 * a drive-less rooted path (`\Users\<name>\x.md`) both still recorded verbatim on POSIX. Any
 * leading backslash covers both, and covers them without enumerating shapes a future Windows adds.
 * Fixing the drive-letter INSTANCE while the class survived is the pattern this chain keeps
 * repeating; the alternation is the class (hostile round 4, self-found).
 *
 * Over-redaction is the documented safe direction: an in-repo file whose name begins with a
 * backslash is not expressible on Windows and pathological on POSIX, so the false-positive costs
 * nothing worth having.
 */
const WIN_ABS = /^([A-Za-z]:[\\/]|\\)/;

/**
 * True for a Windows-absolute path SHAPE, on any host. Exported so the contract is testable
 * without a POSIX machine: on Windows `isAbsolute` already returns true for all three shapes for
 * its own reasons, so a test written against `escapes` passes even with this predicate broken —
 * vacuous exactly where the platform bug lives. Assert this directly instead.
 */
export const isWindowsAbsolute = (p) => WIN_ABS.test(String(p));

/**
 * Final path segment, split on BOTH separators regardless of the running platform.
 * `node:path.basename` splits only on the host separator, so on POSIX
 * `basename('C:\\Users\\<name>\\packet.md')` returns the ENTIRE string — username included — and
 * `shortPath`'s redaction emits verbatim the PII it exists to strip. This is the same
 * platform-relativity as S1 one function over: `escapes()` was corrected while the redaction
 * OUTPUT was left platform-dependent, so detection improved and the leak stayed. Fixing the class
 * rather than the named instance is the point (Kimi round 16, S1b — self-found on re-verification).
 */
/**
 * Collapse a home-directory prefix to `~`, preserving the original separators.
 *
 * WHY IT LIVES HERE: `check-mcp-health.mjs` had its own copy of this policy, with its own separator
 * class and its own escaping history — the `[\/]`-instead-of-`[\\/]` slip that silently disabled
 * redaction on Windows happened in THAT copy. Two reviewers independently flagged the duplication
 * (Kimi round 17 cross-lane; HY3 S2), and the second was right that "they answer different
 * questions" was doing more work than it should: the QUESTIONS differ (collapse-a-prefix vs
 * escape-a-base) but the POLICY — never emit an OS username — is one policy, and it belongs in the
 * module that owns it. The two callers stay separate; the primitive is shared.
 *
 * Three properties, each earned by a defect this redaction actually shipped with:
 *  - a separator is REQUIRED after the prefix, so a sibling sharing it (`…\sean2` vs home `…\sean`)
 *    is not mangled into `~2\…`;
 *  - the separator class must contain a literal BACKSLASH — a version matching only `/` disabled
 *    redaction on Windows entirely, with every test still green;
 *  - the compare is case-INSENSITIVE, because `homedir()` can disagree with an env-supplied path on
 *    case (junctions, 8.3 names, USERPROFILE drift) and a byte-exact match leaves it UNREDACTED.
 *
 * Separators are deliberately NOT normalized: the output names a file the reader will open, and
 * rewriting `~\.claude.json` to `~/.claude.json` would misreport the path on Windows.
 */
export function collapseHome(p, home = homedir()) {
  const s = String(p);
  // Defaults to the real home rather than accepting undefined. Without the default, a future
  // caller writing `collapseHome(p)` gets NO redaction and no error — it fails OPEN, in the one
  // module whose stated asymmetry is "a false positive costs display detail, a false negative
  // leaks a username". A redaction primitive that silently does nothing when under-called
  // contradicts the ownership claim this function was extracted to make (HY3 W3).
  // `home || homedir()`, NOT `home ?? ''`. A default parameter only fires on `undefined`, so an
  // explicit `null`/`''` — the shape a caller produces by forwarding an unset config value — sailed
  // past it into `!h`, and the function returned the path UNREDACTED. Verified by probe: passing
  // null printed a full home path with the username intact. A redaction primitive must not have a
  // falsy argument that means "skip redaction"; falsy now means "use the real home", which
  // over-redacts at worst and is the direction this module documents as safe (HY3 final, W#1).
  const h = String(home || homedir() || '');
  if (!h || !s.toLowerCase().startsWith(h.toLowerCase())) return s;
  const rest = s.slice(h.length);
  return rest === '' || /^[\\/]/.test(rest) ? `~${rest}` : s;
}

export const finalSegment = (p) => {
  const segs = String(p).split(/[\\/]/).filter(Boolean);
  return segs.length ? segs[segs.length - 1] : '';
};

export function escapes(rel) {
  if (isAbsolute(rel) || isWindowsAbsolute(rel)) return true;
  return rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith('../');
}

/** True when `target` resolves outside `from`. */
export const escapesFrom = (from, target) => escapes(relative(resolve(from), resolve(target)));

/**
 * Console/artifact-safe rendering of a path, relative to `from` (default: cwd).
 * Inside `from` -> the relative path (useful, no username). Outside -> `.../<basename>` (enough to
 * identify the file, no prefix). Used for anything that reaches stdout, stderr, or a written
 * artifact — artifacts included, because verdict docs demonstrably get fed back into later prompts.
 */
export function shortPath(p, from = process.cwd()) {
  const rel = relative(resolve(from), resolve(p));
  return escapes(rel) ? `.../${finalSegment(p)}` : rel;
}

/**
 * Repo-relative path for the RECEIPT record, or the literal `<external>` when outside `root`.
 * Distinct from shortPath on purpose: a receipt is a structured field where `<external>` is a
 * meaningful, greppable value, whereas a console line wants the filename. Same escape predicate.
 * Returns null for a missing path so an absent --seed stays absent rather than becoming '<external>'.
 */
export function relativizePath(root, p) {
  if (!p) return null;
  const abs = isAbsolute(p) ? p : resolve(root, p);
  const rel = relative(resolve(root), abs);
  if (rel === '') return '<external>'; // the path IS the root — not a file inside it
  return escapes(rel) ? '<external>' : rel.replaceAll('\\', '/');
}
