# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-MRI2-PACKET.md
**Tokens:** 46613 in / 27044 out (reasoning: 21837) | total 73657
**Wall:** 401.1s

---

# GLM-5.3 MRI ROUND 2 — VERDICT

**Merge with fixes — but fewer than last time, and none of them semantic.** Ten of your ten findings were addressed and eight were genuinely fixed; W1 and I4 are partially fixed in ways that matter (one of the author's own W1 repairs — `motion.md:41` `§A2 lens 4` — is now *invisible to his own gate forever*, and I4's "bare filename citations" half was never implemented at all). More importantly, the rewrite introduced real new defects: the I4 re-keying of `sectionsByFile` silently broke D4's per-file lookup (subdirectory files now get the wrong file's section map, or none — the "all four classes re-proven by injection" proof was run on a root-level file and structurally could not catch it); the DoS he fixed for dash-ranges is still live for comma-chains; and the D1 and D4 passes now run on two different ref grammars that disagree on `and`-continuations. None of this is merge-blocking rot in the corpus — the corpus repairs check out — but items (a)–(f) below are cheap, mechanical, and should land before merge. The author's honesty this round is markedly better: he conceded W2 as the branch committing its own sin and retracted his dismissal of your first-review §27 finding. That is the process working. The remaining weakness is the same one both rounds share: every proof is scoped to the inputs the author had in mind.

---

## 1. PER-FINDING VERIFICATION (Q1)

| # | Finding | Verdict | Evidence |
|---|---|---|---|
| **W1** | Backtick/dash refs invisible; `§§9–22` parsed as §9 | **PARTIALLY FIXED** | Regex now `[`\s]*\s*§{1,2}` after filename — backtick+space form matches (traced: `` `design.md` §25 `` → hit). Ranges expanded; `§§6, 11–12` → body `6, 11–12` → refs 6, 11, 12 — verified against the regex. The four content repairs are consistent with the canon map in commit messages. **But the class is narrowed, not closed**: `design.md, §9` (comma after filename) does NOT match — `[`\s]*` excludes `,`; also `:` `—` `)` between filename and `§`. And the motion.md:41 repair now cites `§A2` — a letter, which `\d+` can never match — see N5. |
| **W2** | Gate exempted attic basenames while index claimed it caught D3 | **FIXED** (fragile, safe-direction) | `orphaned` now requires every mentioning line to carry `/ATTICKED/i`. Replay of 4d192e5ac (live row, no marker) → `allMarked` false → flagged. Trivially defeatable only by an author *lying in prose* ("ATTICKED" on a live row), which is outside a structural gate's remit. Residual fragility: line-granularity means an unmarked mention anywhere in index.md blocks an honest note — false-positive direction, i.e., safe. No destination-path requirement. Acceptable. |
| **W3** | Hook validated working tree, not index | **FIXED, correct choice** | Refusal on any tree≠index diff across `design-brain/` **and** `scripts/design-brain/` (which also prevents stage-a-passing-checker). Refusing is sound: the alternative (check the index properly) requires materializing staged blobs — see Q5. Residual: the outer trigger grep still doesn't fire on `scripts/design-brain/`-only commits — see N8. |
| **W4** | `anti-patterns.md:49` §15 possible 18th wrong-target | **AGREE — correct as-is** | Canon §15 is the a11y floor ("color never sole signal"); the badge is the example, the rule is the target. One line, move on. |
| **W5** | 24px modal radius vs README scale | **CONFIRMED — author-caused false alarm** | README now quotes canon §9 complete (`20/12/999/24`). Canon text not in packet; accepted packet-bounded. Note the fix embeds the full scale in README — good, since the abbreviated version caused this. |
| **W6** | README described nonexistent build; hook said D1/D2/D3 | **FIXED** | Hook message now "D1-D4". README claims checked line-by-line against the code in Section 4: ranges ✓, attic-row wording ✓, external-target listing ✓, "no CI job" ✓, tree-vs-index refusal ✓. No new drift found. |
| **I1** | External refs silently skipped; case-mismatch | **PARTIALLY FIXED** | Counted and listed ✓; `resolveTarget` lowercases both sides, so `DESIGN.md` resolves ✓. **But it's a NOTE, exit 0** — a typo'd `motions.md §4` keeps the gate green forever. Counting made silence visible, not actionable. See N7. |
| **I2** | D2 substring containment | **FIXED** | `listedExact` set of backticked basenames, exact `has()` comparison. Residual: basename collapsing means all four `index.md` files are D2-satisfied by one root listing (N11). |
| **I3** | Decimal coercion; `## 15.1` unparseable | **FIXED as scoped** | Heading regex takes `\d+(?:\.\d+)?`; `§9.2` carried as `9.2`, flags if absent. **New gap created by the fix**: decimal *ranges* (`§§1.5–3.5`) fail `Number.isInteger` and fall to the single-ref path, which captures `1.5` and silently drops `–3.5` — the W1 half-dangling sin reintroduced for the decimal form (N9). Bare decimals invisible to D4 (`/§\s*(\d+)/`). |
| **I4** | Bare filename refs; `./index.md` ambiguity | **PARTIALLY FIXED** | Path-aware resolution ✓ (dir-relative → root-relative → unique-basename → ambiguity reported); the four-`index.md` collision is genuinely resolved; `../` from subdirs resolves via basename fallback (traced). **But the other half of I4 — bare filename citations with no `§N` (`qa-gates.md` cites `cinematic-pages.md`) — is still completely unvalidated.** `refsIn` requires a `§`; a bare mention of a deleted file produces nothing at all, not even a NOTE. The claim "refs to files outside the corpus are now counted" is true only of the filename+§ form. |

---

## 2. NEW DEFECTS — WHAT THE FIXES BROKE (Q2)

| Rank | Finding | Where | Severity | Why it costs |
|---|---|---|---|---|
| **N1** | **D4's `ownMax` looks up the re-keyed map with a stale basename key.** `sectionsByFile` is now keyed by lowercase full path (I4 fix), but the D4 loop still calls `sectionsByFile.get(basename(rel))`. For every subdirectory file (`adapters/hermes.md` → `get('hermes.md')` → `undefined` → ownMax=0). Worse for the three sub-`index.md` files: `get('index.md')` returns the **root index's** section map — wrong file's data, silently. Result: any bare `§N>17` in a subdir file that is a valid *self*-reference false-flags as impossible; conversely a genuinely impossible bare ref in `obsidian/index.md` is judged against the root index's max. Uppercase root files (README.md → key `readme.md`) also get ownMax=0. | D4 block, `ownMax` line | **HIGH** | False positives are the exact "cries wolf and gets disabled" failure the author named. And the "all four classes re-proven by injection" proof ran on a root file where `basename(rel) === rel` — it structurally could not find this. Classic proof-scoped-to-intended-input. |
| **N2** | **The comma-chain DoS is still live.** `MAX_RANGE_SPAN` bounds dash-expansion only. The continuation `(?:\s*(?:,|and|[–—-])\s*§?\s*\d+)*` is unbounded: one line `design.md §99, 99, 99, … ×N` produces N dangling records, each printed with 110 chars of context. Identical flood-the-gate failure to the one he fixed, one separator over. | `refsIn` body/continuation | **MED-HIGH** | The author's own standard — "adversarial input against the range expansion" — applied to his own fix would have found this. Bound belongs on refs-emitted-per-expression, not per-range. |
| **N3** | **D1 and D4 now run on divergent grammars.** refsIn accepts `and`-continuations; the D4 stripper `[a-z0-9-]+\.md.{0,3}§+\s*[\d,\s]*\d` does not (`[\d,\s]` excludes letters). `field-techniques.md §15, and §18` from a file with ownMax<18: D1 sees only §15 (body regex stops at `and`-after-comma), the stripper leaves `, and §18` behind, D4 flags §18 as impossible-bare — false positive when §18 exists in the target. Right answer sometimes, wrong mechanism always. | D4 strip regex vs `refsIn` | **MED** | Two regexes describing "a reference" will drift; they already have. D4 should consume refsIn's match offsets, not re-parse. |
| **N4** | **Bare-filename citations remain wholly unvalidated** (existence never checked, no NOTE) — the original I4 example (`qa-gates.md` → `cinematic-pages.md`) is still invisible. Deleting a bare-cited file stays silent forever. | `refsIn` requires `§` | **MED-HIGH** | File-rot via the most casual citation form is ungated while the branch claims external refs are "counted and listed." |
| **N5** | **Lettered section refs are a blind dialect — and W1's own repair moved into it.** `§A2` can never match `\d+`; `## A2 …` headings parse to nothing, so `adapters/reviewers.md` has an empty section map (any future digit-ref into it false-dangles; the current `§A2 lens 4` ref is permanently uncheckable). The author converted an invisible-*broken* ref into an invisible-*fixed* one and the gate validates it never again. | `refsIn`, `sectionsOf`; `motion.md:41` | **MED** | If reviewers.md renumbers its lenses, the exact original rot recurs, CLEAN all the way. |
| **N6** | **Joined-ref forms drop their tails.** `§8/§18` → body `8`, `/` not a separator → §18 invisible (live instance: CLAUDE.md:157, outside scan scope, but the shape is ungated in-corpus too). Same for `§9 to 22`, `§8 & §18`, and `, and` mixed chains (N3). Every one is the half-dangling W1 class wearing a new separator. | `refsIn` continuation set | **MED** | The class was narrowed to the three separators the author thought of. |
| **N7** | **Unvalidated/ambiguous targets are NOTE-only — exit 0.** A typo'd filename is indistinguishable from an external doc *only because there is no allowlist*. Two verified external targets are stable strings; everything else unknown could hard-fail. Ambiguity (an in-corpus collision!) is also merely noted. | skippedTargets block | **MED** | The gate stays green over filename rot — the failure class I1 named — now with a NOTE that will be read once and never again. |
| **N8** | **Hook trigger grep misses `scripts/design-brain/`.** A commit that edits or deletes the checker itself, staging nothing under `docs/ai-workflow/design-brain/`, never runs the gate. The gate's own integrity is un-gated. | `.githooks/pre-commit`, outer `grep -qE '^docs/ai-workflow/design-brain/'` | **MED** | One-line fix: add `|^scripts/design-brain/` to the pattern. (Self-deletion of the hook remains inherently un-gateable — inherent, not a defect.) |
| **N9** | **Decimal ranges silently truncated** (`§§1.5–3.5` → checks only §1.5, drops `–3.5`) — via the non-integer fallback in the range branch. | `refsIn` split/range logic | **LOW-MED** | The precise W1 mechanism, reintroduced by the I3 fix, on a rarer form. Treat non-integer range operands as malformed-one-finding. |
| **N10** | **Filename–§ separator shapes evade**: `design.md, §9` / `design.md: §9` / `design.md — §9` / `(design.md) §9` all fail `[`\s]*\s*§`. | `refsIn` | **LOW-MED** | Comma-after-filename is a common prose form. Broaden to `.{0,3}` (which the D4 stripper already uses — inconsistently). |
| **N11** | **D2 basename collision**: all four `index.md` files satisfy the index law via the single root listing; a deleted `obsidian/index.md` row is undetectable. Same collision class I2 claimed to close, on the D2 axis. | `unindexed` filter | **LOW** | Structural, latent, no live case. |
| **N12** | Stat line under-counts: "70 refs" excludes the 5 skipped refs; summary prints `skippedTargets.size` (files) while the NOTE lists ref counts. Also the 44→70 delta doesn't reconstruct cleanly from the packet's listed repairs (~68 by my count) — publish the `--titles` list so the number is re-derivable, per the author's own build-the-counter lesson. | summary `console.log` | **LOW** | Cosmetic + the exact count-hygiene the branch's own learning packet preaches. |

---

## 3. THE THIRD LAYER — STILL-UNGATED ROT, RANKED (Q3)

1. **Consumers outside `design-brain/`.** Proven live: `CLAUDE.md:157` / `AGENTS.md:163` cite `cinematic-pages.md §8/§18` — §18 never existed in any revision. The constitution is the most-loaded file in the repo and the brain's biggest customer; the checker's walk starts and ends at the brain folder. The constitution-references hook resolves *paths*, not *sections*.
2. **`design.html` + its fictional generator.** Proven live: the mirror carries its own §-scheme contradicting canon, while `design.md:14` claims `pnpm canon:build` + CI reverts — no script, no job, no pnpm. Doctrine says "they ship together"; nothing checks either half. This is the third fictional mechanism and it's a *wrong-target generator*, not just a stale pointer.
3. **Bare-filename citations** (N4) — existence ungated.
4. **Prose/title-form refs**: "section 9 of design.md", "per the accessibility floor", "the Two-speed law" — no `§`, no filename grammar, invisible to every check including `--titles`.
5. **Lettered dialects** (`§A2`, and in-corpus analogues of `§B`/`§C1–C12` if any corpus file adopts them) — N5.
6. **Joined-separator forms** (`§8/§18`, `to`, `&`, `, and`) — N6.
7. **Eternal NOTEs**: a citation of an *atticked* file resolves to nothing in-corpus and is reported as "unvalidated external" forever — indistinguishable from a typo, guaranteeing the NOTE gets ignored (compounds N7).
8. **[HYPOTHESIS]** Refs inside `scripts/` code comments, JSON schemas, and skill files that point into the brain — same rot class, never scanned; unverified because absent from this packet.
9. **The load path itself**: nothing verifies agents load via `index.md` at all — the manifest/load-pack gap from round 1, still open by design.

---

## 4. Q4 — `MAX_RANGE_SPAN = 50` AND MALFORMED-AS-ONE

50 is the right size (canon max is 17; historical max §28; generous margin) and report-as-one-malformed is the right *behavior* — a reversed or absurd range can never resolve, so one actionable finding beats a flood. Two corrections: (1) the bound is on the wrong axis — N2's comma-chain produces the identical flood through an unbounded `*`; cap total refs emitted per refsIn expression (~64) regardless of separator form. (2) Non-integer range operands bypass the range branch entirely and get silently truncated (N9) — they should be malformed-one-finding too. Also note the malformed record's message reads "has §1–§17, not §22-9" — conveys, but "malformed range §§22–9 (reversed)" would self-explain.

## 5. Q5 — REFUSAL VS CHECKING THE INDEX

Refusing is correct *direction* and honest — far better than certifying the wrong tree — but it's the cheap half of the engineering. The right fix is small: materialize the staged blobs (`git checkout-index --prefix="$TMP/" -- docs/ai-workflow/design-brain/ scripts/design-brain/`), give the checker a `--brain <dir>` override (currently BRAIN is hard-derived from `import.meta.url`), and run it against exactly what will be committed. What the refusal wrongly blocks today: committing one repaired brain file while mid-edit on another (the *normal* rhythm of an incremental repave — this branch itself would have hit it repeatedly), and any commit with unrelated dirty brain WIP — blast radius wider than the staged set. Keep the refusal as fallback until the override exists. `--no-verify` remains the universal bypass; that's why the checker should also ride a real CI job — which the README now honestly admits doesn't exist.

## 6. Q6 — THE THREE DEFERRALS

- **`CLAUDE.md`/`AGENTS.md` §18: should have been fixed in this branch.** It is a two-line edit, the exact defect class this branch exists to kill, in the constitution every agent loads first. "Deferred to Sean" is defensible for decisions; this is a pointer to a section that *never existed in any revision* — there is nothing to decide. Indefensible pacing.
- **`design.html` divergence: deferral correct** — whether to build a generator or hand-reconcile is Sean's scope call.
- **The `pnpm canon:build` claim: half-wrong deferral.** The *strategy* defers; the *lie* doesn't have to. Deleting or truing one sentence in `design.md:14` is this branch's thesis statement. Leaving a known fictional mechanism in canon while shipping a gate against fictional mechanisms is the W2 sin at lower stakes.

## 7. Q7 — FICTIONAL-MECHANISM SWEEP: ACCEPTANCE CRITERIA

**Scope:** parse `design-brain/**`, `CLAUDE.md`, `AGENTS.md` for claims of the forms *enforced by / generated by / CI reverts / lint rejects / the gate blocks / fails the build* + any backticked artifact name grammatically attached to them (script paths, npm script names, CI job ids, lint rule ids, hook paths). **Verification:** each named artifact must mechanically resolve — file exists, `package.json` script exists, workflow job exists, hook path wired. **On finding:** exactly three exits — (a) repair the citation to a real mechanism, (b) delete the mechanism claim (aspiration stays as prose *without* an enforcement verb), (c) Sean-approved dated exception. Never a silent allowlist. **Self-honesty requirements, or it becomes the fourth fiction:** (1) injected-defect proof — a planted "enforced by `scripts/nope.mjs`" must FAIL; (2) pattern-count-zero guard → exit 2 (pattern rot in the checker itself); (3) its README/commit description verified against behavior, as a test; (4) an explicit header stating its limit — *existence ≠ enforcement*; a script that exists but doesn't do what's claimed is out of scope and must be said so; (5) CRLF-safe `lines()`, bounded output, deterministic — reuse the idioms already paid for. **Acceptance:** on current main it reports exactly the three known fictions (`swan/*` in 8 docs, the resolved gate-D3 claim as fixed-history, `pnpm canon:build`) plus zero unexplained others, each with file:line and the missing artifact named.

## 8. Q8 — MERGE VERDICT

**MERGE WITH FIXES.** The corpus repairs are real and cross-check; the gate is a substantially better instrument than round 1; the hook is sound in direction; the README finally tells the truth. Required before merge, all mechanical, none semantic:

- **(a)** Fix D4's lookup: `sectionsByFile.get(rel.toLowerCase())` — N1.
- **(b)** Cap total refs per refsIn expression (comma/and chains) — N2.
- **(c)** Derive D4's bare-scan from refsIn's match spans, or mirror its full continuation grammar — N3.
- **(d)** Policy call, minimum: AMBIGUOUS targets become a failure (in-corpus collision is not "external"); ideally an explicit external allowlist with unknowns failing — N7.
- **(e)** Hook trigger grep adds `^scripts/design-brain/` — N8.
- **(f)** Non-integer range operands → malformed-one-finding — N9.

Strongly recommended, non-blocking: fix the constitution `§18` pointer in-branch (Q6); support lettered headings or document the dialect as a named blind spot in the checker header rather than silently (N5); publish the `--titles` ref list so "70" is re-derivable (N12).

## 9. Q9 — ANYTHING ELSE

- The committed review artifact `GLM-53-MRI-REPAVE-REVIEW.md` is truncated mid-sentence in I4 — a records file that ends mid-finding will mislead a future reader about what the review covered. Truncate deliberately or complete it.
- The injection proofs now have a demonstrated blind pattern: each proof exercises the happy path of the class (root file, digit ref, dash range). Add one subdir-file injection and one `and`-chain injection to the standing proof set — both would have caught N1 and N3 this round.
- The author's meta-lesson ("I only had correct inputs in mind") is correct and, per N1/N2, still unfalsified by his own practice: the DoS fix bounded the axis he had just been burned on, not the adjacent one. The lesson's procedural form — enumerate the *grammar* of an input class, then test each element — is the actual correction, and it's still resolutional.
