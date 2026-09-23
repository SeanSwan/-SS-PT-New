# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-p0-slice-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 3107 in / 5235 out · **Cost:** ~$0.0000 · **Wall:** 128.8s · **finish:** stop

---

## VERDICT
REVISE — the correction is genuinely executed but provably incomplete (downstream artifacts unaccounted for, one internal contradiction inside the correcting packet itself), and the systemic guard against the failure class is still discipline-shaped, so P1 would inherit the exact error class this slice existed to kill.

## BLOCKERS

1. **P1 — The correction is incomplete: two of the four downstream artifacts have no recorded disposition.** §1 states a blueprint, an artifact, a tracker issue, and a learning packet were built on the false premise. §2 corrects the blueprint (item 1) and the learning packet (item 7). The **tracker issue and the artifact appear nowhere in the 13-file manifest** — no closure comment, no void banner, no supersession link. Failure scenario: the next agent triages the tracker, reads a still-open P0 blocker asserting `world.miniature-play.voxel-realm` doesn't exist, and re-derives the false premise — the precise recurrence this slice was funded to prevent. Fix: close/comment the tracker issue and annotate the artifact in this slice, or state explicitly in §2 why they're out of scope. Evidence: §1 ¶3 vs §2 items 1–7.

2. **P1 — The correcting packet contains its own factual contradiction about the lore docs.** §2 item 4 says the two lore docs are "reaching `main` for the first time"; the verified list in the same section says "the two RPG docs **already on main** were byte-identical… and were restored rather than overwritten." These cannot both be true of the same pair of files. Either (a) "lore docs" and "RPG docs" are four distinct files and the packet fails to say so, or (b) one of the two claims is false — in a document whose entire reason for existing is eliminating false grounded claims. Fix: name all four filenames explicitly with per-file provenance (`new-to-main` vs `restored-identical`). Evidence: §2 item 4 vs §2 "Verified during the slice."

3. **P1 — B1 is acknowledged but unresolved, and the slice makes it worse: `assets/registry.json` is a second enumerable catalog with zero tooling.** The original failure was a capped instrument reporting absence. The fix shipped is prose. Meanwhile the slice *adds* a new frozen-ID-style catalog (asset IDs, zone IDs, skeleton IDs) that future agents will verify with… the same ad-hoc grep habits. Failure scenario: P1's validator work begins with `grep -n "fallen-food-court" assets/registry.json | head -5`, misses an entry behind the cap, and produces false-absence claim #2. Cheapest deterministic guard (concrete, not discipline): extend the existing `scripts/ai-workflow/world-engine-catalog-validation.mjs` pattern into a `catalog-check.mjs <file> <id>` CLI that enumerates the full file, prints the total count, and exits nonzero on absence — plus a pre-commit hook that rejects any staged `.md` under `docs/ai-workflow/` whose diff contains both an existence/absence phrase and a `grep … | head`/`| tail` pipeline. Crude, but it would have caught the original sin mechanically. Evidence: §3 B1, §2 item 5.

4. **P2 — Fabricated budgets are being baked into a future enforcement gate (B6, unanswered).** §4 Q4 asks the right question; the answer is yes: budget fields must be `null` with an explicit `"measured": false` status until a real mesh passes through gltf-transform. A plausible 1500/700/300 written today becomes "repo doctrine" tomorrow by the same authority-acquisition path as the false evidence row. Fix: null them now, add a validator rule that fails loudly on `null` at P1 exit. Evidence: §3 B6.

5. **P2 — The five verbatim seat outputs are false-premise carriers with no per-file void marker.** §2 item 3 archives them "verbatim + index." Four contain P0 blockers derived from the false row; one contains a REJECT resting on it. A future agent grepping the handoff directory hits authoritative-looking seat verdicts with no inline correction — only the index (if even that) flags them. Fix: prepend a one-line void banner to each affected seat file naming the struck premise, keeping bodies verbatim below it. Evidence: §2 item 3.

6. **P2 — "Sugar Crash kept" violates the slice's own health-language rule without recorded justification.** The rule as stated: debuffs "named for the environment/material, never the person." Three debuffs were renamed to comply; "Sugar Crash" describes a human physiological event and survived with zero rationale recorded. Either it has a justification (write it down) or it's an inconsistency the next health-language pass will trip on. Evidence: §2 item 6.

7. **P2 — The Law-A/Law-B embedding question is undefined and blocks P1 design (sharper version of B4).** B4 notes P1 straddles both palettes. What nobody asked: **may a Swan-chromed (Law-A) surface render/embed a Law-B asset at all?** The constraint says no Swan-branded *surface* may use Law-B *chrome* — silent on content. If embedding is forbidden, the entire product concept (Swan app hosting a Voxel Realm game) is self-contradictory; if permitted, the render-boundary rules (UI chrome vs world content) need to be written before P1 authors a single mesh. Evidence: §1 final paragraph, §3 B4.

## ATTACKS

**Correctness**
- Stale-state/merge hazard: branch cut from `origin/main` into an isolated worktree while four agents hold locks (§2 preamble). Nothing pushed; no rebase plan stated. When it lands, concurrent edits to `docs/ai-workflow/**` from the locked agents can silently conflict — and given this repo's demonstrated sensitivity to doc drift, a bad merge here is a correctness event, not a nuisance.
- Off-by-one class recurrence: the original failure was literally a cap (`head -8`) truncating an enumeration. Nothing in the slice audits *other* capped enumerations in the corpus. If `head` bit once in `worlds.md`, the same pattern may exist in other verification commands recorded in past packets — unaudited.

**Security**
- Secret scan ran on 13 *staged* files pre-commit (§2) — clean, but the scan scope is the diff, not the tree; fine for this slice, worth noting the habit doesn't catch secrets already resident.
- Provenance fields (`model:<name>@<version>:<license-id>`, SHA-256) are free-form strings destined for a validator. Unbounded enum values with embedded structure are injection-adjacent for whatever parses them later; the validator spec should pin a strict grammar now. Also unverifiable: whether `registry.json` currently contains placeholder SHA-256 values — if so, that's fabricated data acquiring authority, same class as B6.
- No rate-limit/DoS/authz surface exists (docs-only slice) — N/A, noted rather than invented.

**Data-truth / schema drift**
- Registry key casing convention is unspecified (snake_case IDs, but field-name style for `triangleBudget` vs `triangle_budget` unstated). The validator doesn't exist yet, so the first implementation will *define* the contract retroactively — drift guaranteed unless the registry pins it now.
- Cross-file ID uniqueness was checked within `registry.json` only ("no duplicate IDs"); uniqueness against `worlds.md` IDs and the frozen expected-ID list is unverified.
- Frontend response-shape drift: N/A — zero frontend files, correctly guarded (0 frontend files reported clean).

**House-rule compliance:** docs-only slice; styled-components/Victory/palette/touch-target rules vacuously satisfied. No "yoga/meditation" language present. Zero-PII honored (IDs/roles only, "Owner" defined). No credential phrasing invoked. No violations found.

## HIGHEST RISK
The false-premise failure class recurring through the **new** catalog: `assets/registry.json` is now the second enumerable ID space in the repo, it has no validator, no checking CLI, and no guard against capped-grep absence claims — and P1's first act is to build against it. Cheapest de-risk before P1 starts: a ~30-line `catalog-check.mjs` following the frozen-expected-ID pattern already proven in `world-engine-catalog-validation.mjs`, wired as a pre-commit check, plus pushing the branch so `origin/main` stops lacking the registry and lore docs (B7 — right now every other agent is working against a main where the fix doesn't exist).

## CONFIDENCE
I could not verify from the document alone:
- **Actual file contents** — no diffs or file excerpts are supplied; every claim about banners, struck rows, and registry fields is taken on the packet's word. Full `git show e5f707d88 --stat` plus the registry JSON would settle it.
- **Tracker issue and artifact disposition** — they may have been handled outside the repo (external tracker); the packet's silence is the finding, but external closure would downgrade Blocker 1 to a documentation gap.
- **Whether "lore docs" and "RPG docs" are the same two files** — Blocker 2 is a contradiction *in the packet* regardless, but which side is false changes the fix.
- **Whether `registry.json` holds placeholder SHA-256/provenance values** — one read of the file settles it.
- **Whether the `head -8` truncation account is arithmetically accurate** (entries 14–15 producing exactly eight lines) — unreproducible without the file; immaterial to the verdict since the entry's existence is independently attested by the frozen expected-ID list.

I am confident in the structural findings (incomplete correction sweep, missing guard, null-budget answer, Law-embedding ambiguity); I am explicitly *not* confident about anything resting on file contents I haven't seen.
