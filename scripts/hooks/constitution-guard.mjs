#!/usr/bin/env node
/**
 * constitution-guard.mjs — block a commit that silently deletes MANDATORY rules
 * from CLAUDE.md / AGENTS.md, or that leaves the two constitutions divergent.
 *
 * WHY THIS EXISTS
 * ---------------
 * 2026-08-14. Commit 10a3e7fa1 ("feat(skills): design-dialogue — and a cost
 * figure in rule 16") removed 255 lines from CLAUDE.md. Its two intended edits
 * were correct and shipped. It ALSO silently reverted nine MANDATORY rules that
 * had landed since the author's copy of the file was taken:
 *
 *     46 Kimi Hostile-Review Gate   (reverted to the retired 3-Brain/Fable loop)
 *     73 ADW Discipline             75 Trailhead-Truth
 *     76 Create-With-Context        77 Dead-File Quarantine
 *     78 Agent Workflow Mode Router 79 Tests Can Encode The Bug
 *     80 Second-Vantage Verification 81 Test-Delta Disclosure
 *
 * and renumbered Proof-Before-Done 74 -> 73, colliding with AGENTS.md. Nothing
 * failed. The commit was green. Claude read a constitution missing 9 rules for
 * ~15 hours while Codex read the complete one, and the two agents silently
 * operated under different law.
 *
 * The class is "stale-copy clobber": an agent regenerates a whole file from a
 * snapshot it holds in context, keeps its own edits, and reverts everything that
 * landed in between. No tool reports it, because writing a file is not an error.
 *
 * WHAT IT CHECKS  (every check prints its verdict — a silent guard is not a guard)
 *   1. RULE REMOVAL   — a rule present in HEAD is absent from the staged file.
 *   2. RULE RENUMBER  — a rule NAME whose number changed. This produced the
 *                       73/74 collision, and it breaks every citation silently.
 *   3. RULE REVERSION — a rule whose BODY regressed: materially shorter, or it
 *                       dropped the "MANDATORY" token, or it lost an amendment
 *                       marker. See "WHY CHECK 3 EXISTS" below.
 *   4. MIRROR PARITY  — AGENTS.md's body must equal CLAUDE.md byte-for-byte.
 *
 * WHY CHECK 3 EXISTS (added after Kimi K3 hostile review, 2026-08-14)
 * ------------------------------------------------------------------
 * The first version of this guard did NOT cover its own founding incident.
 * 10a3e7fa1 damaged rule 46 by reverting its BODY to a superseded policy. The
 * guard caught that only by luck: the rule had also been renamed, so the
 * name-keyed check saw a removal. Had the name held constant — the normal case
 * for a stale-copy clobber, which reverts text without renaming anything —
 * checks 1, 2 and 4 would all have passed green while the law silently rolled
 * back. The reviewer's words: "the guard does not catch the actual failure
 * class it was built for."
 *
 * Check 3 is deliberately tuned to REVERSION, not to change. Honest amendment
 * adds text; a stale-copy clobber restores older, shorter text and drops the
 * enforcement paragraphs and "AMENDED <date>" markers that accumulated since.
 * Blocking every body edit would be noise, and a noisy guard teaches people to
 * reach for --no-verify — which would cost more than it saves.
 *
 * WHY CHECK 4 IS NOT A CLOBBER DEFENSE (same review, finding D4)
 * -------------------------------------------------------------
 * Mirror parity is a CONSISTENCY check and nothing more. A commit carrying a
 * damaged CLAUDE.md together with an AGENTS.md regenerated FROM it satisfies
 * parity by construction. It catches partial commits only. The clobber defenses
 * are checks 1-3; check 4 is not counted among them.
 *
 * ESCAPE HATCHES (deliberate changes are legitimate; silent ones are not):
 *     SWAN_ALLOW_RULE_REMOVAL="46,73"   removal / renumber / reversion of those rules
 *     SWAN_RULE_RENAME="46=46"          rule at 46 in HEAD is now the rule at 46
 *                                        under a NEW name (verified against a real
 *                                        addition — never accepted on faith)
 * Both are keyed by the rule's number IN HEAD. Naming the numbers makes the change
 * a decision on the record, not an accident. Rename gets its own hatch because
 * forcing a legitimate rename through the *removal* hatch is how a check teaches
 * people to reach for --no-verify instead.
 *
 * ⚠ KNOWN OPEN BYPASS, stated plainly rather than left implicit (Kimi round 2, Q3):
 * this is a client-side pre-commit hook. `git commit --no-verify`, a direct push, or
 * a commit made from a checkout without these hooks skips it entirely. There is no
 * server-side enforcement today — this repo's own audit found all 30 most recent CI
 * workflow runs ended in `startup_failure`, and branch protection returns 403 on the
 * current plan, so "add a required status check" is not currently executable. Treat
 * this guard as a strong seatbelt, NOT as a boundary that holds against intent.
 * The cheapest real closure available here is detective, not preventive: a scheduled
 * job running this script against origin/main and alerting on failure.
 *
 * EXIT: 0 = pass or not applicable. 1 = blocked.
 */
import { spawnSync } from 'node:child_process';

const MIRROR_MARKER = '--- project-doc mirror from CLAUDE.md ---';
const FILES = ['CLAUDE.md', 'AGENTS.md'];

const git = (args) => {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' };
};

/**
 * Rules as name -> {num, name, body, len, mandatory, amendments}, parsed from the
 * MANDATORY Rules section only. The body is captured so check 3 can detect a
 * reversion, which is invisible to name/number comparison.
 */
function parseRules(text) {
  const start = text.indexOf('## MANDATORY Rules');
  if (start === -1) return null; // shape changed — reported, never silently passed
  const rest = text.slice(start);
  const end = rest.indexOf('\n## Dual-Pass Fix/Review Discipline');
  const section = end === -1 ? rest : rest.slice(0, end);

  const lines = section.split('\n');
  const heads = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(\d{1,3})\. \*\*(.+?)(?:\*\*| — | -- | - )/.exec(lines[i]);
    if (m) heads.push({ i, num: Number(m[1]), name: m[2].trim() });
  }

  const rules = new Map();
  for (let h = 0; h < heads.length; h += 1) {
    const { i, num, name } = heads[h];
    const stop = h + 1 < heads.length ? heads[h + 1].i : lines.length;
    const body = lines.slice(i, stop).join('\n').trim();
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 48);
    if (!key) continue;
    rules.set(key, {
      num,
      name,
      body, // retained so a declared rename can be checked for content continuity
      len: body.length,
      // Reversion signatures: the enforcement word, and the amendment markers
      // that only ever accumulate forward.
      mandatory: /MANDATORY/.test(body),
      amendments: (body.match(/\b(AMENDED|Established|added)\b/gi) ?? []).length,
    });
  }
  return rules;
}

/**
 * Shrink tolerance — DERIVED, not chosen. (Kimi round 2, F4: "15% is asserted,
 * not derived", and the original 15% was in fact reverse-engineered from one
 * failing case.)
 *
 * Measured across the 73 rules present both before and after the 2026-08-14
 * repair: 24 changed size, and **zero of them shrank**. Every honest edit in the
 * observed history GREW. Shrinkage of a MANDATORY rule is the incident signature;
 * growth is not. So the tolerance is a noise floor, not a budget.
 *
 * 2% ≈ a typo or whitespace fix on a 2,000-character rule (~40 chars). Anything
 * that removes a sentence trips it. This is 7.5x tighter than the original.
 *
 * KNOWN LIMIT, stated rather than papered over: a same-length rewrite that inverts
 * meaning passes every size check by construction. Size cannot detect semantics.
 * That gap is real and is why MANDATORY-parity and marker checks exist alongside.
 */
const SHRINK_TOLERANCE = 0.02;

/**
 * Aggregate budget across all surviving rules (Kimi round 3, D3).
 * Tighter than the per-rule floor on purpose: individual rules legitimately get
 * tightened, but the WHOLE constitution shrinking is the clobber signature at a
 * different scale. In the measured history the aggregate GREW, so any net loss
 * across the corpus is already anomalous. 0.5% of ~180k chars ≈ 900 characters —
 * roughly half a rule — which is the point at which "editorial tightening" stops
 * being a plausible description of what happened.
 */
const AGGREGATE_SHRINK_TOLERANCE = 0.005;

/**
 * Minimum token overlap for a DECLARED rename to be believed — also derived.
 * The one known-legitimate rename in this repo's history (rule 46, "3-Brain
 * Review Loop" -> "Kimi Hostile-Review Gate") scored **42.5%**. The reviewer
 * proposed 60%, which would have rejected that real rename. Set at 25%: well
 * under the observed legitimate case, well over an unrelated rule (an unrelated
 * pairing scores near zero on content words of 4+ characters).
 */
const RENAME_MIN_OVERLAP = 0.25;

/**
 * Structural scaffolding shared by EVERY rule. Left in, it manufactures false
 * continuity: the first version of this check scored a deliberately unrelated
 * replacement at 28.6% — over the threshold — purely because both bodies said
 * MANDATORY / Established / AMENDED / a year. A short replacement makes that
 * boilerplate a large fraction of its whole vocabulary. Its own test caught it.
 */
const STRUCTURAL = new Set([
  'mandatory', 'established', 'amended', 'added', 'rule', 'rules', 'body', 'text',
  'sean', 'claude', 'codex', 'swanstudios', 'this', 'that', 'with', 'from', 'have',
  'been', 'when', 'then', 'than', 'they', 'their', 'them', 'what', 'which', 'because',
  'after', 'before', 'every',
  // NOTE: 'never', 'always', 'must', 'should', 'would', 'could' were ALSO stripped
  // here until Kimi round 3 (D1) pointed out that those words ARE the rule. Stripping
  // modality from a continuity metric means an exact semantic inversion —
  // "never commit generated files" -> "always commit generated files" — scores as
  // near-perfect continuity. The check was blind to the single most damaging
  // laundering payload in its own threat model. They are content; they stay.
]);
const YEARISH = /^\d{4}(-\d{2})*$/;

/**
 * Two different jobs, and conflating them defeated the first version of this check.
 *
 * POLARITY decides whether a rule permits or forbids: never/always/not/forbidden.
 * Flipping one inverts the rule. STRENGTH says how binding it is: must/shall/may.
 * Those do not invert meaning.
 *
 * The first implementation compared the union. "You must never commit X" vs "You
 * must always commit X" both contain `must`, so the shared-modal test passed and
 * the inversion sailed through — its own regression test caught that. Only polarity
 * is compared now.
 */
// `required` sits in POLARITY, not STRENGTH, on purpose (Kimi round 4, item 2):
// "X is required" -> "X is recommended" is a downgrade expressed with no modal verb
// at all, so a strength-only classification would never see it. Treated as polarity,
// the governed word loses its polarity entirely and the deletion branch below fires.
// Compared by DIRECTION, not by token identity. Comparing tokens makes an honest
// passive rewording look like an attack: "never commit X" -> "committing X is
// forbidden" swaps the token while preserving the prohibition exactly. Both are
// NEGATIVE, so direction-comparison passes it, while never -> always still flips.
const NEGATIVE = new Set(['never', 'not', 'cannot', 'no', 'avoid', 'refuse',
  'forbidden', 'prohibited', 'banned', 'only', 'except']);
// `must` belongs in STRENGTH, not POSITIVE. Classifying it as a polarity made
// "must never commit X" register BOTH directions on the same word, so dropping the
// `never` still left POSITIVE shared and the negation-deletion check went quiet —
// re-opening the exact hole it had just been built to close. Its own test caught it.
const POSITIVE = new Set(['always', 'required']);
const POLARITY = new Set([...NEGATIVE, ...POSITIVE]);
const STRENGTH = new Set(['must', 'shall', 'may', 'should']);
const direction = (w) => (NEGATIVE.has(w) ? 'NEGATIVE' : 'POSITIVE');

/**
 * Adverbs and intensifiers that sit between a polarity word and the thing it
 * actually governs. Found by probing the shipped scanner rather than by reading it:
 * "never, ever, commit secrets" attached NEGATIVE to "ever", so deleting the `never`
 * left "commit" unpolarised in BOTH versions and the deletion check stayed silent —
 * a false NEGATIVE, the dangerous direction. Skipped like modals so the polarity
 * lands on the real subject.
 */
const FILLER = new Set(['ever', 'also', 'then', 'still', 'generally', 'typically',
  'simply', 'merely', 'just', 'again', 'else', 'even', 'more', 'most', 'very',
  'really', 'quite', 'ONLY_PLACEHOLDER_NEVER_MATCHES']);

/** Hard clause terminators. A polarity does not reach across a sentence end. */
const CLAUSE_END = new Set(['.', ';', ':', '—', '?', '!']);

/** Copulas — the marker that a polarity word is doing passive duty ("is forbidden"). */
const COPULA = new Set(['is', 'are', 'was', 'were', 'be', 'been', 'being', 'remains', 'stays']);
const MODALS = new Set([...POLARITY, ...STRENGTH]);

/**
 * Detect a modality flip on shared subject matter.
 *
 * Bag-of-words overlap cannot see inversion: "never commit X; always run Y" and
 * "always commit X; never run Y" have identical vocabulary. Measured on real data:
 *   - presence-parity (does the rule still contain 'never'?)  MISSES the attack
 *     entirely — both texts contain never:1 always:1.
 *   - ordered-sequence parity BLOCKS the one legitimate rename in this repo's
 *     history, whose modal sequence legitimately changed.
 * Neither extreme is usable, so this checks the narrower thing that actually
 * distinguishes them: a content word that was governed by one modality before and
 * a DIFFERENT modality after. "commit" governed by 'never' then by 'always' is an
 * inversion; a rule that simply grew new clauses is not.
 *
 * HONEST LIMIT: this is a heuristic, not a proof. A careful rewrite that changes
 * meaning without reusing the victim's modal-object pairs will pass, as will any
 * inversion expressed through synonyms. The rename hatch is a convenience for
 * honest authors, not a boundary against a determined one — consistent with the
 * `--no-verify` reality stated at the top of this file.
 */
function modalInversions(oldBody, newBody) {
  const pairs = (s) => {
    // Sentence terminators are kept as their own tokens so a polarity cannot reach
    // across a sentence boundary (Kimi round 5). Commas are NOT terminators —
    // appositives like "never, under any circumstance, commit X" are one clause.
    const w = s.toLowerCase()
      .replace(/([.;:?!—])/g, ' $1 ')
      .replace(/[^a-z0-9\s.;:?!—]/g, ' ')
      .split(/\s+/).filter(Boolean);
    const out = new Map(); // content word -> Set(polarity DIRECTIONS governing it)
    const attach = (word, modal) => {
      if (!out.has(word)) out.set(word, new Set());
      out.get(word).add(direction(modal));
    };
    for (let i = 0; i < w.length; i += 1) {
      if (!POLARITY.has(w[i])) continue; // strength modals do not invert meaning
      // Look FORWARD for the imperative form ("never commit X") and BACKWARD for
      // the passive form ("committing X is forbidden"). Forward-only scanning made
      // every passive rewording look like a dropped negation.
      for (let j = i + 1; j < Math.min(i + 6, w.length); j += 1) {
        if (CLAUSE_END.has(w[j])) break;                                  // do not cross a sentence
        if (MODALS.has(w[j]) || FILLER.has(w[j]) || w[j].length <= 3) continue;
        attach(w[j], w[i]); break;
      }
      // Scan BACKWARD only for a genuine passive construction — "committing X is
      // forbidden" — signalled by a copula immediately before the polarity word.
      // Scanning backward unconditionally attached "avoid" to the "please" in
      // "please avoid large commits", and since "please" survives any rewording
      // unpolarised, every such reword false-blocked. That is the exact
      // false-positive the reviewer predicted, arriving through the fix for
      // passives rather than through the window width they expected.
      if (!COPULA.has(w[i - 1])) continue;
      for (let j = i - 2; j >= Math.max(i - 6, 0); j -= 1) {
        if (CLAUSE_END.has(w[j])) break;
        if (MODALS.has(w[j]) || FILLER.has(w[j]) || COPULA.has(w[j]) || w[j].length <= 3) continue;
        attach(w[j], w[i]); break;
      }
    }
    return out;
  };
  const A = pairs(oldBody); const B = pairs(newBody);
  // Every content word still present in the new body, so "the clause was deleted"
  // can be told apart from "the clause survived but lost its negation".
  const newWords = new Set(newBody.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));

  const flipped = [];
  for (const [word, oldModals] of A) {
    const newModals = B.get(word);
    if (!newModals) {
      // Kimi round 4, F1. The first version did `continue` here, treating "no
      // polarity after" as "not an inversion". That let the MOST dangerous edit
      // through: drop the negating token and keep everything else, and a MANDATORY
      // prohibition silently becomes a permission — "never commit credentials"
      // becomes "commit credentials". Absence IS a polarity value.
      // A word that vanished entirely is a clause deletion, which the per-rule and
      // aggregate shrink checks already own; only survival-without-polarity is this
      // check's business.
      if (newWords.has(word)) {
        flipped.push(`"${word}" was governed by ${[...oldModals].join("/")} and is now governed by NOTHING — the negation was dropped while the subject survived, which turns a prohibition into a permission`);
      }
      continue;
    }
    const shared = [...oldModals].some((m) => newModals.has(m));
    if (!shared) flipped.push(`"${word}" was governed by ${[...oldModals].join('/')} and is now governed by ${[...newModals].join('/')}`);
  }
  return flipped;
}

/**
 * Content-word overlap, scaffolding removed. MEASURED separation on real data:
 *   legitimate rename (46: 3-Brain -> Kimi gate) ... 33.1%
 *   unrelated rule pairings ..................... 8.8% - 14.9%
 *   unrelated short replacement ................. 0.0%
 * 25% sits ~10 points above the worst unrelated case and ~8 below the real one.
 */
function tokenOverlap(a, b) {
  const words = (s) => new Set(
    s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 3 && !STRUCTURAL.has(w) && !YEARISH.test(w)),
  );
  const A = words(a); const B = words(b);
  if (!A.size || !B.size) return 0;
  const shared = [...A].filter((w) => B.has(w)).length;
  return shared / Math.max(Math.min(A.size, B.size), 1);
}

/**
 * Fail CLOSED. Only ONE condition may fail open — a repo with no HEAD yet, where
 * there is genuinely nothing to compare against.
 *
 * The first version fail-opened on any git error, reasoning that it must not
 * block unrelated work. The reviewer called that backwards (finding D3), and was
 * right: a guard against silent clobbers must not go silent exactly when the
 * tooling is already misbehaving. A shallow clone, a corrupt object, or a `git`
 * shim earlier on PATH would have waved the clobber straight through.
 */
function die(reason) {
  console.error(`\n[constitution-guard] BLOCKED — cannot verify constitution integrity: ${reason}`);
  console.error('  This check fails CLOSED. If git is genuinely unavailable here, fix that first.');
  process.exit(1);
}

// ---- applicability -------------------------------------------------------
const staged = git(['diff', '--cached', '--name-only']);
if (!staged.ok) die(`could not list staged files (${staged.err.trim().slice(0, 120)})`);

const touched = FILES.filter((f) => staged.out.split('\n').includes(f));
if (touched.length === 0) {
  console.log('[constitution-guard] no constitution file staged — SKIP');
  process.exit(0);
}
if (!git(['rev-parse', 'HEAD']).ok) {
  // The one sanctioned fail-open: nothing to compare against yet.
  console.log('[constitution-guard] no HEAD yet (initial commit) — SKIP');
  process.exit(0);
}

const allowed = new Set(
  (process.env.SWAN_ALLOW_RULE_REMOVAL ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean),
);
const usedHatch = new Set();

// Rename declarations are tracked at module scope for the same staleness check as
// SWAN_ALLOW_RULE_REMOVAL — a rename hatch left set is exactly as dangerous.
const renameDecls = new Map(
  (process.env.SWAN_RULE_RENAME ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    .map((pair) => pair.split('=').map((s) => s.trim()))
    .filter((p) => p.length === 2 && p[0] && p[1]),
);
const renamesDeclared = new Set(renameDecls.keys());
const usedRenames = new Set();

const blockers = [];
let checked = 0;

// ---- checks 1, 2, 3: removal, renumber, reversion ------------------------
for (const file of touched) {
  const head = git(['show', `HEAD:${file}`]);
  const next = git(['show', `:${file}`]);
  // D3: a file we cannot read is a file we cannot clear. Never skip past it.
  if (!head.ok) die(`${file}: could not read HEAD version (${head.err.trim().slice(0, 100)})`);
  if (!next.ok) die(`${file}: could not read staged version (${next.err.trim().slice(0, 100)})`);
  const beforeText = file === 'AGENTS.md' ? head.out.slice(head.out.indexOf(MIRROR_MARKER)) : head.out;
  const afterText = file === 'AGENTS.md' ? next.out.slice(next.out.indexOf(MIRROR_MARKER)) : next.out;

  const before = parseRules(beforeText);
  const after = parseRules(afterText);
  if (!before || !after) {
    blockers.push(`${file}: the "## MANDATORY Rules" section could not be parsed — the document shape changed. Verify by hand.`);
    continue;
  }
  checked++;

  const removed = [];
  const renumbered = [];
  const reverted = [];
  for (const [key, was] of before) {
    const now = after.get(key);
    // Decide whether this rule is VIOLATING first, and only then consult the
    // hatch. The obvious order — check the allowlist up front and `continue` —
    // marks every allowlisted number as "used" even when that rule never
    // changed, which makes the stale-override warning below unreachable and
    // prints "OVERRIDE ACTIVE" for rules nobody touched. Caught by its own test.
    let violation = null;
    if (!now) {
      violation = () => removed.push(was);
    } else if (now.num !== was.num) {
      violation = () => renumbered.push({ was, now });
    } else {
      // Check 3 — body reversion. Tuned to the signatures of restoring OLDER
      // text, not to change in general, so honest amendment stays quiet.
      const why = [];
      const shrink = (was.len - now.len) / Math.max(was.len, 1);
      if (shrink > SHRINK_TOLERANCE) why.push(`body shrank ${Math.round(shrink * 100)}% (${was.len} -> ${now.len} chars)`);
      if (was.mandatory && !now.mandatory) why.push('dropped the "MANDATORY" token');
      if (now.amendments < was.amendments) why.push(`lost ${was.amendments - now.amendments} amendment marker(s)`);
      if (why.length) violation = () => reverted.push({ was, why });
    }
    if (!violation) continue;

    // The allowlist is keyed by the rule's number IN HEAD and authorizes every
    // intentional change to that rule: removal, renumber, or body reversion.
    // An unblockable check is a check people learn to bypass wholesale, so
    // legitimate changes need a sanctioned way through — Proof-Before-Done
    // genuinely moved 73 -> 74 during this very repair.
    if (allowed.has(String(was.num))) { usedHatch.add(String(was.num)); continue; }
    violation();
  }

  // D3 (Kimi round 3): the per-rule floor is per-rule, and the incident signature
  // is a property of the DIFF. Trim twenty rules by 1.9% each and every one clears
  // 2% while a rule's worth of constitution quietly disappears. Aggregate is
  // measured over rules present in BOTH versions, so declared removals — which are
  // already authorised and loud — do not count against the budget.
  // Same principle for rules that SURVIVE but were DECLARED (2026-08-25, first
  // legitimate narrative-cut): a trim named in SWAN_ALLOW_RULE_REMOVAL is a
  // decision on the record, exactly as authorised-and-loud as a declared removal —
  // counting it against the aggregate budget left the check unsatisfiable for the
  // RULEBOOK trailer's own `narrative-cut` class ("declare it" with no way to).
  // The budget still guards every UNDECLARED rule at full strength.
  let aggBefore = 0; let aggAfter = 0;
  for (const [key, was] of before) {
    const now = after.get(key);
    if (!now) continue;
    if (allowed.has(String(was.num))) {
      if (now.len !== was.len) usedHatch.add(String(was.num));
      continue;
    }
    aggBefore += was.len; aggAfter += now.len;
  }
  const aggShrink = aggBefore ? (aggBefore - aggAfter) / aggBefore : 0;
  if (aggShrink > AGGREGATE_SHRINK_TOLERANCE) {
    blockers.push(`${file}: the surviving rules lost ${(aggShrink * 100).toFixed(1)}% of their combined length (${aggBefore} -> ${aggAfter} chars) even though no single rule tripped the per-rule floor. Death by a thousand trims is the same outcome as a clobber. Declare it or split it.`);
  }

  console.log(`[constitution-guard] ${file}: ${before.size} rules in HEAD -> ${after.size} staged; ${removed.length} removed, ${renumbered.length} renumbered, ${reverted.length} reverted; aggregate body ${aggShrink >= 0 ? '-' : '+'}${Math.abs(aggShrink * 100).toFixed(2)}%`);

  // Q2 — rename is a first-class operation, not an error.
  // A rule renamed in place reads as removal-of-X + addition-of-Y, and the only
  // way through used to be the generic removal hatch. That is how a check trains
  // people to reach for --no-verify: it calls a legitimate edit a violation and
  // offers no honest way to say what you meant. Rule 46 was renamed exactly this
  // way (3-Brain Review Loop -> Kimi Hostile-Review Gate).
  // SWAN_RULE_RENAME="46=46" declares "the rule at 46 in HEAD is the rule at 46
  // now, under a new name" — verified against a real addition, never taken on faith.
  const added = [...after.entries()].filter(([k]) => !before.has(k)).map(([, v]) => v);
  const renames = renameDecls;
  const acceptedRenames = [];
  for (let i = removed.length - 1; i >= 0; i -= 1) {
    const target = renames.get(String(removed[i].num));
    if (!target) continue;
    const match = added.find((a) => String(a.num) === target);
    if (!match) {
      blockers.push(`${file}: SWAN_RULE_RENAME claims ${removed[i].num}=${target}, but no NEW rule appears at ${target}. A rename must land somewhere.`);
      continue;
    }

    // F1 (Kimi round 2, the worst defect this workstream shipped): the first
    // version accepted a rename on the mere EXISTENCE of an addition at the target
    // number. That turned the hatch into a deletion-laundering channel — delete
    // MANDATORY rule 46, add an unrelated rule 46, declare the rename, and the
    // guard reports a verified-looking PASS while the law silently changes. It was
    // strictly worse than no hatch, because it manufactured false confidence.
    // A rename must now prove CONTINUITY, not just occupancy.
    const overlap = tokenOverlap(removed[i].body, match.body);
    const continuity = [];
    if (overlap < RENAME_MIN_OVERLAP) continuity.push(`content overlap ${(overlap * 100).toFixed(1)}% is below the ${(RENAME_MIN_OVERLAP * 100)}% floor — these read as two different rules, not one renamed`);
    if (removed[i].mandatory && !match.mandatory) continuity.push('the old rule was MANDATORY and the replacement is not — a rename cannot quietly downgrade a rule');
    const flips = modalInversions(removed[i].body, match.body);
    if (flips.length) continuity.push(`the obligation INVERTED on shared subject matter — ${flips.slice(0, 2).join('; ')}. Identical vocabulary with flipped modality is a rewrite, not a rename`);
    if (continuity.length) {
      blockers.push(`${file}: SWAN_RULE_RENAME ${removed[i].num}=${target} REJECTED — ${continuity.join('; ')}. If this really is a deletion plus an unrelated new rule, say so with SWAN_ALLOW_RULE_REMOVAL="${removed[i].num}" instead of calling it a rename.`);
      continue;
    }

    acceptedRenames.push({ from: removed[i], to: match, overlap });
    usedRenames.add(String(removed[i].num));
    removed.splice(i, 1);
  }
  for (const { from, to, overlap } of acceptedRenames) {
    console.log(`[constitution-guard] rename accepted (${(overlap * 100).toFixed(1)}% content continuity): ${from.num} "${from.name.slice(0, 36)}" -> ${to.num} "${to.name.slice(0, 36)}"`);
  }

  // When removals and additions coexist undeclared, name the likely pairing
  // instead of just refusing. An error that tells you the exact command to run
  // gets used; one that only says "blocked" gets bypassed.
  if (removed.length && added.length) {
    const hint = removed.map((r) => {
      const guess = added.find((a) => a.num === r.num) ?? added[0];
      return `${r.num}=${guess.num}`;
    }).join(',');
    blockers.push(`${file}: ${removed.length} rule(s) removed and ${added.length} added in the same commit — this may be a RENAME, not a deletion. If so, declare it: SWAN_RULE_RENAME="${hint}"`);
  }

  for (const r of removed) blockers.push(`${file}: rule ${r.num} "${r.name.slice(0, 70)}" exists in HEAD and is GONE from the staged file.`);
  for (const { was, now } of renumbered) blockers.push(`${file}: "${was.name.slice(0, 60)}" renumbered ${was.num} -> ${now.num}. Every "Rule ${was.num}" citation in the repo now points elsewhere.`);
  for (const { was, why } of reverted) blockers.push(`${file}: rule ${was.num} "${was.name.slice(0, 55)}" looks REVERTED, not edited — ${why.join('; ')}. This is the stale-copy signature: older text restored over newer law.`);
}

// ---- check 4: mirror parity (consistency only — NOT a clobber defense) ----
const cRes = git(['show', ':CLAUDE.md']);
const aRes = git(['show', ':AGENTS.md']);
if (cRes.ok && aRes.ok) {
  const mi = aRes.out.indexOf(MIRROR_MARKER);
  if (mi === -1) {
    blockers.push('AGENTS.md: mirror marker missing — the Codex adapter header boundary is gone.');
  } else {
    const body = aRes.out.slice(mi + MIRROR_MARKER.length).replace(/^(?:\r?\n)+/, '');
    const parity = body === cRes.out;
    console.log(`[constitution-guard] mirror parity: ${parity ? 'IN SYNC' : 'DRIFTED'}`);
    if (!parity) blockers.push('AGENTS.md body != CLAUDE.md. Codex and Claude would read different law. Fix: node scripts/sync-agents-mirror.mjs');
  }
} else if (touched.length === 1) {
  console.log(`[constitution-guard] only ${touched[0]} staged; mirror parity checked against the index copy of the other file`);
}

// ---- verdict -------------------------------------------------------------
// D2: the hatch is a standing credential if it is left set in a shell profile or
// CI env. It cannot be un-invented, so make its use LOUD and its staleness visible.
if (usedHatch.size) {
  console.warn(`[constitution-guard] ⚠ OVERRIDE ACTIVE — rule change(s) ${[...usedHatch].sort().join(', ')} were waved through by SWAN_ALLOW_RULE_REMOVAL.`);
  console.warn('[constitution-guard] ⚠ This authorizes ONLY those numbers. If you did not mean to set it, unset it — it is not scoped to one commit.');
}
// F6 (Kimi round 2): a warning printed at the moment of misuse is not expiry.
// The hatch cannot be un-invented, but it CAN be made intolerable to leave set:
// an entry that authorises nothing in THIS commit blocks the commit outright.
// A variable left in a shell profile therefore fails the very next commit with an
// instruction to unset it, instead of lying in wait to silently wave through a
// removal three commits later. The cost is one loud failure; the alternative is a
// standing bypass credential nobody remembers granting.
const unused = [...allowed].filter((n) => !usedHatch.has(n));
if (unused.length) {
  blockers.push(`SWAN_ALLOW_RULE_REMOVAL names rule(s) ${unused.join(', ')}, which changed nothing in this commit — this is a STALE override still set from earlier work. Unset it: the hatch authorises exactly one commit, never a session. (\`unset SWAN_ALLOW_RULE_REMOVAL\`)`);
}
const unusedRenames = [...renamesDeclared].filter((n) => !usedRenames.has(n));
if (unusedRenames.length) {
  blockers.push(`SWAN_RULE_RENAME declares ${unusedRenames.join(', ')}, which renamed nothing in this commit — stale override. Unset it.`);
}

if (blockers.length === 0) {
  console.log(`[constitution-guard] PASS (${checked} file(s) rule-checked)`);
  process.exit(0);
}

console.error('\n' + '━'.repeat(60));
console.error('COMMIT BLOCKED: constitution integrity');
console.error('━'.repeat(60));
for (const b of blockers) console.error(`  • ${b}`);
console.error(`
This is the 10a3e7fa1 failure class: a whole-file rewrite from a stale copy
keeps its intended edits and silently reverts everything that landed since.

If the removal is DELIBERATE, name the rule numbers so it is a decision:
    SWAN_ALLOW_RULE_REMOVAL="46,73" git commit ...

If it is NOT deliberate, you are about to delete law that another agent is
still operating under. Re-apply your edit onto the CURRENT file instead.
`);
process.exit(1);
