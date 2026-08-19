# SWAN BRAIN — post-ship hostile review: what did we actually ship to production?

- **Shipped:** `main` @ `f17502bf9`, 2026-08-16. Render auto-deploys from `main`, so this is live.
- **Now:** `main` has moved 13 commits since; the shipped state survives (gate present, 0 live-mirror claims).
- **This is a POST-ship review.** Nothing is pending approval. The question is what we got wrong and what the next agent must fix.

---

## 0. REMIT

1. **What did we ship that is wrong, incomplete, or overclaimed?**
2. **What did shipping reveal that the pre-ship rounds could not?**
3. **What should the next agent do first, and what should they NOT do?**

Tables first: `ID | severity | claim | evidence | fix`, then a prioritised next-agent table. Prose last.
Severity CRITICAL / HIGH / MEDIUM / LOW. Label unverifiable claims **HYPOTHESIS**.
**Do not manufacture findings** — but this is the last look before the work is considered done, so a missed real defect is expensive.

---

## 1. WHAT SHIPPED

A 28-file markdown doctrine corpus (`docs/ai-workflow/design-brain/`) that every AI agent loads before building UI had rotted silently: a canon rewrite renumbered `design.md` from 28 sections to 17 and no satellite followed. An agent hitting a dead pointer resolves it SAFELY — it skips the doctrine it cannot find — so quality degraded while every file still read correct. 34 structural defects accumulated invisibly.

Shipped in three merges, one push:

1. **Constitution fix** — Rule 40 in both constitutions cited `cinematic-pages.md §18`, which has never existed. Also resynced the `AGENTS.md` mirror, which had drifted and was still serving Codex the June rule 67 that `CLAUDE.md`'s own rewrite calls "the text that caused the failure it existed to prevent."
2. **The repave** — 25 dangling refs, 4 index-law violations, 4 orphaned rows, 20 wrong-target pointers repaired; `design.html` retired to `docs/_attic/`; canon's "Enforcement files" line (ten named mechanisms, nine nonexistent) replaced with truth; a six-class gate (`scripts/design-brain/check-brain-links.mjs`, 73 tests) added.
3. **SWA-171** — both constitutions now state the mirror is retired, so `main` never carried the contradiction.

---

## 2. THE DEFECT I FOUND AFTER SHIPPING — GRADE THIS HARSHLY

**The gate I shipped runs on exactly one machine.**

`scripts/design-brain/check-brain-links.mjs` is invoked from `.githooks/pre-commit`, which only executes when `core.hooksPath=.githooks` is set. That is **local git config — it is not committed and nothing installs it**:

- no `prepare` / `postinstall` script in `package.json`
- no husky
- no committed setup script that sets it
- `brain:links` is **not referenced by any CI workflow**

Measured:

| surface | gate status |
|---|---|
| worktrees on the author's machine | **runs** — worktrees share one `.git` config |
| a fresh clone, another machine, a cloud agent | **silent** |
| CI | **never invoked** |

And I wrote into canon, as part of the commit that deleted nine fictional mechanisms:

> `scripts/design-brain/check-brain-links.mjs` + `npm run brain:links` (cross-reference gate; wired into `.githooks/pre-commit` via the `BRAIN_LINKS` block — verified 2026-08-16)

That verification was true **on my machine**. It is not true of the repository. **I shipped a new instance of the exact fictional-mechanism class this entire workstream existed to delete, inside the commit that deleted the others.**

**Questions for you:** How severe is this really — does a gate that runs on the owner's machine still deliver most of the value, since he is the one merging? What is the correct fix: a `prepare` script, a CI job, both, or something else? And is the canon wording now false, or merely incomplete?

---

## 3. OTHER THINGS TO ATTACK

1. **`design.html` is gone and nothing replaced it.** It was the design system's only human-visual reference — token swatches, type specimens. Kimi argued at the time that a *drifting* visual mirror is worse than none for a design corpus ("a wrong textual claim gets argued with; a wrong visual gets copied"). Was retiring it right, and does the corpus now have a hole a human feels?
2. **Three hand-maintained copies of the review-header derivation** (`consult.mjs`, `consult-hy3-design.mjs`, `consult-glm.mjs`) are now co-located on `main`. Same regex, same constant, no shared module. This is the `design.md`/`design.html` failure at code scale, and it already caused one miss (HY3 was fixed last, found by grep not memory).
3. **Two tests remain red on `main`** — a pre-existing "external-reference receipt/fallback contract is incomplete" failure in `verify-world-engine`. Not caused by this work (verified against unmodified main), and my change had briefly *masked* it behind a crash. Now visible and ticketed. **Is shipping with a known-red gate acceptable, or did we normalise it?**
4. **The palette anchor check hardcodes five brand hex values** in a verifier. If canon legitimately rebrands, the check fails until someone edits the script. Correct strictness or a maintenance trap?
5. **The retired-tier sentinel matches a literal string** (`Tier 3 — Reduced motion`, plus the colon form). Verbatim tripwire, paraphrase-evadable by design. Documented as such. Worth having?
6. **Scope discipline:** did this workstream sprawl? It began as "review the design brain" and ended up touching two constitutions, three consult scripts, a world-engine verifier, and two test files.

---

## 4. WHAT THE PRE-SHIP ROUNDS ALREADY COVERED — do not re-raise without new evidence

Four rounds. GLM CLEAN at R3 and R4 (R4 attacking the post-R3 fixes); Kimi R1–R3; Fable and HY3 earlier.

Already fixed: the "pre-existing red does not absolve the delta" finding (a crash that masked a real defect); the sixth "sole source of truth" site; a palette floor that both passed *and* failed for the wrong reasons; a negative sentinel deleted with its subject; a line number written into canon as proof; a rationale comment that overstated its own evidence.

Already disproven by execution: `core.hooksPath` IS set on this machine; `body`/`document` are file contents not paths; no reader parses the old static headers; rule 67's commanded artifacts exist.

---

## 5. VERIFICATION EVIDENCE AT SHIP TIME

| check | result |
|---|---|
| merge conflicts | 0, across five successive `main` SHAs |
| brain gate | CLEAN — 28 files · 75 refs · 0 defects |
| design-brain suite | 73 pass / 0 fail |
| `verify-world-engine` | 9 pass / 2 fail — identical to main's baseline |
| `receipt-prune` | 4 pass / 0 fail — main's baseline was 4/1 |
| constitution guard | PASS — 82 rules in, 82 out, parity IN SYNC |
| constitution refs | 139 checked, 0 unresolvable |
| secret scan | CLEAN on every commit |

Verified post-push on the remote ref: gate present on `main`, `design.html` absent from the brain and preserved in the attic, `§8/§18` count 0, live-mirror claims 0.
