# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-R6-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 7649 in / 11404 out | **Cost:** ~$0.1940 | **Wall:** 585.9s | **finish_reason:** stop

---

# Round-6 review — v2.5 delta

## PART A — hostile findings, ranked by cost × likelihood

### A1. HEADLINE: `idle` is file-scoped, locks are section-scoped — and v2.5 just gave that mismatch three consumers
`parseLane` computes `idle` with `/^Status:\s*(idle|released|done)/mi` against the **entire file**, while locks come from the **first** `EDITING NOW` section. Your own doctor addition admits multi-section lanes exist in the wild (1 of 3 violated newest-first on 2026-08-12). So: release() writes `Status: idle`; an agent hand-re-claims by appending a fresh section (hand-editing is the documented norm) without deleting the old Status line; `idle` is now true; `activeLocks` returns `[]`. Before v2.5 this desync meant the push hook *disagreed* with the digest — bad, but at least one reader still warned. By unifying all three consumers on `activeLocks`, you converted a disagreement into a **simultaneous, silent, three-channel suppression of live locks** — including the push-time clash warning, which is the only signal in this system that fires at the moment of irreversibility. The unanchored alternation (`done` matches `done-ish`, `released pending`) widens the blast radius. This is the round-5 pattern exactly: two of your fixes (idle-awareness + consumer unification) are each defensible and together are worse than either alone.

### A2. Quoted extraction reorders tokens, which breaks the path-plus-commentary branch it feeds
`toks = [...quoted, ...loose]` puts quoted segments **first regardless of original position**, but the fallback branch still assumes `toks[0]` is the line's first token and computes `remainder` from `rest` (the quote-stripped copy). Two live-lock shapes now parse to nothing:
- `- backend/a.ts "do not touch, see PR"` → `toks[0]` is `"do not touch, see PR"`, not pathish → `return []`. Lock dropped.
- `- "backend/migrations/014 add col.sql" adds the stripe column` → quoted path survives to `toks[0]`, but `remainder` is five plain words, fails bracket/short-dash/one-word → `return []`. **This is the precise line shape the quoted-extraction fix exists to support** — a space-bearing migration path with a trailing note — and the conditional-splitter kills it. The two headline fixes in this delta disagree with each other. Also note `rest.replace(/^\S+\s*/, '')` doesn't skip leading whitespace, so `remainder` is often the whole rest-of-line, making `words` counts wrong in the benign direction only by luck.

### A3. `afterPush` doesn't stop at command separators — the DEPLOY-LINKED false positive survives for the *other* common flow
You fixed `git pull origin main && git push origin feature` but not `git push origin feature && git checkout main` — equally standard. `afterPush` swallows everything after the first `push`, `deRef` finds `main`, DEPLOY-LINKED fires on a feature push. Slice at the first `&&`, `;`, or `|` or you've only moved the fatigue generator. Your own delta states the cost: false positives train readers to ignore the highest-severity flag the hook has.

### A4. The `-C` fail-closed fires when it shouldn't, and isn't actually closed
- The regex now runs on **raw `cmd`**, so it matches inside quoted strings belonging to *other* commands: `git commit -m "revert the -C handling" && git push origin feature` captures `handling` (or similar) as a path, `existsSync` fails, and every such push prints 🔴 UNCHECKED. The old code matched on `bare` specifically so quoted content was blanked; this fix re-admits the bug class for a new target.
- The comment says "the analysis is skipped and the skip is stated." The code does not skip anything — it analyses cwd and prints full figures under the 🔴. A skimming reader sees `branch:` and a file list and trusts them. Either skip or stop calling it fail-closed.
- `--git-dir`/`--work-tree` are matched on **`bare`**, so the *quoted* forms — the exact case you fixed `-C` for — still fall through to cwd **silently**. The comment claims support the code doesn't deliver.
- `replace(/[/\\]\.git$/, '')` turns a legitimate bare-repo target `C:/repos/repo.git` into nonexistent `C:/repos/repo` → false fail-closed on a valid push.

### A5. `altRoot` is parsed with `\S+` — the space-path bug one level up
`Worktree:\s*(\S+)` truncates any worktree path containing a space — the norm on Windows and the entire motivation for the quoted-extraction fix — and quoted `Worktree:` lines capture a leading `"`. Result: the extensionless existence hatch resolves against a garbage root and drops locks, in a repo with ~110 worktrees. You fixed quoted paths in lock lines and left the header your own new feature depends on unquoted-only. Additionally, `altRoot` is attacker/lane-controlled input feeding `existsSync`: `Worktree: C:/` makes `pathish("Users")` true and mints locks from prose.

### A6. Sibling detection over-matches on `startsWith(stem)`
Stem of `claude-wt1-sA1.lane.md` is `claude-wt1`, which `startsWith`-matches `claude-wt10-sB2.lane.md` — a different worktree reported as "same agent+worktree from another session." The one guard against the known-open duplicate-session problem cries wolf. Compare against `stem + '-s'` or a boundary.

### A7. The cwd-hint fix fixed one of two entry points
The session-start hook now prints the resolved `LANE` path — but `digest()` itself still emits `run: node scripts/lane.mjs claim ...` (relative) in its NOT-published warning, and the hook prints digest output immediately above its own resolved hint. Same session-start output, two contradictory claim commands, one of which is the bug the comment says must never come back.

### A8. Half-fix in tree-sentinel: `ahead` nulled, `behind` left `undefined`
Same failed `rev-list`, same `else` branch: `wt.ahead = null` gets a klass and a comment; `wt.behind` stays `undefined` for JSON consumers. If unknown deserves its own state, it deserves it for both counts.

### A9. Trivia
Dead `parseLane` import in push-blast; scp exclusion requires `@`, so `github.com:org/repo.git` still false-fires the refspec warning; backtick-quoted space-paths (`` `a b.ts` ``) still shatter because backticks are stripped before quote extraction — agents backtick paths habitually, so either handle them or document the asymmetry.

**Do-not-re-report respected.** Nothing above re-opens settled design; A1–A3 are all "two v2.5 fixes interacting," which is three of your five attack prompts converging on the same conclusion: the delta's defects are internal to the delta.

---

## PART B — what Sean does next, in order

**1. Enable branch protection on `main`. Today, before any code.**
Nine passes agree it's the only control covering `gh pr merge`, the API, and off-machine agents — every advisory hook is theater while the one real gate stays open, and it costs a human ten minutes.

**2. Decide keep-or-discard on the 191 files behind the 27-day lane, then release that lane.**
It's the largest single pool of unreviewed work and its 186 locks poison every digest and sentinel output; this is a decision, not engineering, and only Sean can make it.

**3. Worktree triage: run tree-sentinel, merge-or-delete the 42 dirty/merged worktrees, target under 20 total.**
4,235 uncommitted files across 42 working copies is unrecoverable-work risk that also makes every advisory signal noise — use the tool you built instead of building more of it.

**4. Fix A1 and A2 only, timeboxed, with a regression fixture of real lane files.**
Both silently drop live locks — the core signal — and a fixture corpus of actual lanes is the only thing that breaks the measured "fix contains the next defect" cycle; everything else in Part A waits.

**5. Ungitignore the ledger (or commit a sanitized snapshot).**
Off-machine agents currently see nothing, which means the system's stated purpose fails exactly at the repo boundary — cheap, and it multiplies the value of everything already built.

**6. Kill the duplicate live session on the main tree.**
Two writers on one tree is how the ledger forked last time; v2.5's sibling note already ships the detection, so this is an action, not a build.

**7. Wire the existing prune script into the session-start hook — one line.**
Unbounded log growth is a slow certain failure and the script is already written; invoking it is the cheapest closed item on the list.

**8. Then stop, and go back to the product.**
Six rounds in, the marginal defect lives in code paths no real session hits, while the SaaS gets zero hours — set a rule that further work here requires a defect observed in production use, not a hypothetical from a review pass.

### Defer (with a note in the skill, then forget)
- **doctor reaper / rotation story** — advisory tooling for a problem item 3 solves manually once.
- **A4–A8 polish** — real but low-blast-radius; batch them into the *next* triggered fix, not a dedicated round.
- **session-env warning upgrade** — informational is the right severity for an advisory system.

### Stop doing entirely
- **Scheduled hostile-review rounds of your own fix deltas.** The measured pattern — each fix round births the next defect — means review-driven hardening is now *adding* risk and cost (~$1.50 and counting) faster than it removes either; switch to incident-driven fixes only.
- **Refining push-hook parsing heuristics as a safety strategy.** The guarantee belongs server-side (item 1); once branch protection is on, the hook is best-effort UX and does not deserve another regex.
- **Treating the ledger as the product.** It is scaffolding for agents building a SaaS; every hour past item 8 is an hour the actual product doesn't get.
