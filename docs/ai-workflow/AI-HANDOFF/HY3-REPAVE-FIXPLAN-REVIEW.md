# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (medium)
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md
**Seed:** (none)
**Tokens:** 4142 in / 4523 out | **Cost:** ~$0.0029 | **Wall:** 64.7s | **finish_reason:** stop

---

| ID | severity | claim | evidence file and line | proposed fix |
|----|----------|-------|------------------------|--------------|
| F1 | HIGH | Two conflicting canonical token scales (`design.md §9` vs `typography-grid.md §5`) with no mechanical enforcement; reconciling changes geometry app-wide. | `design.md §9`, `typography-grid.md §5` (per §3.1); verified `scripts/ci/check-token-discipline.mjs` checks only hex (§3.1) | Plan: (1) Declare `design.md §9` authoritative; (2) Edit `typography-grid.md §5` to either adopt canon or explicitly document a scoped exception; (3) Extend `scripts/ci/check-token-discipline.mjs` to parse `swan/spacing`, `swan/z-scale`, `swan/two-speed` scales. All options reversible: doc edits via git; linter extension removable. |
| F2 | HIGH | `design.html` uses independent numbering diverging from canon, causing wrong-target section citations. | `design.html` (per §3.2) | Plan: Retire `design.html` to `docs/_attic/` (reversible via git) OR regenerate it from `design.md` via a real build script (reversible by deleting script). Maintaining honestly requires continuous sync; not recommended. |
| F3 | HIGH | `design.md:14` asserts a fictional build mechanism (`pnpm canon:build` + CI revert) that does not exist (no script, no CI, repo uses npm). | `design.md:14` (per §3.3) | Plan: Either strike the claim from `design.md:14` (reversible edit) OR implement `npm run canon:build` + CI guard (reversible by removal). Must not leave false claim. |
| F4 | HIGH | Both constitutions cite `cinematic-pages.md §18` which has never existed (max §17); correct is §8. | `CLAUDE.md:157`, `AGENTS.md:163` (per §3.4) | Plan: Submit one-character edit (`§18`→`§8`) through the separate constitution governance guard. Reversible via git; guard block must be respected. |
| F5 | HIGH | `adapters/knowledge.md` Policy column points entirely to atticked files while header points to `../obsidian/` and `../graphify/` (each now one index). | `adapters/knowledge.md` (per §3.5) | Plan: Rewrite Policy column to cite live `../obsidian/` and `../graphify/` indexes (reversible edit); OR retire file to attic; OR restore attic files. All reversible via git. |

| where else | is the rot present? | how you'd check |
|------------|-------------------|----------------|
| `frontend/src/**` (code comments citing brain doctrine) | Not scanned (§5.3c); rot class possible, cannot verify without run | Extend the verbatim scanner to `frontend/src/**` (md, ts, tsx, js) parsing comments with same `refsIn()`/`sectionsOf()`; inject positive control (`cinematic-pages.md §18`) to validate. |
| `backend/` | Not scanned (§5.3c); same risk | Same extension to backend paths. |
| `.github/` and git hooks outside `scripts/` | Not scanned (§5.3c) | Scan those paths for `*.md` and workflow yaml for brain citations. |
| Skill *frontmatter* (YAML) rather than body | Not scanned (§5.3c); citations may hide in YAML keys | Parse frontmatter separately with same regex; verify with known dead ref injection. |
| Reverse direction: 6 external files cited by brain (`SWAN-CINEMATIC-DESIGN-SYSTEM.md` etc.) | Sections unverified by gate (§5.3d); rot possible | Modify gate to parse those external files' sections (they exist) and validate `§N`; currently explicitly skipped. |
| Prose / title-form references (§5.3b) | Unmeasured, likely present but invisible to all checks | No current method; propose semantic extraction of phrases ("Taste Bible") mapped to canon headings via manual audit or NLP. |
| Heading dialects within brain (§5.3a) | Present (found) but not fixed; root-cause candidate | Normalize to single dialect or annotate dialect in gate; not a new surface but unaddressed. |

**Prose**

The five unfixed items are each silent doctrine losses (HIGH) because agents loading the corpus will follow contradictory or dead pointers with no error. None are CRITICAL today because no build is shipped solely from these docs, but F1’s reconciliation could become CRITICAL if executed without the lint guard. All proposed fixes are reversible via git or script removal; the only irreversible act would be deleting attic files without backup, which we do not propose.

On question 2: the rot class—silent structural decay—is confirmed absent in the scanned external surfaces (§5.2) but the un-scanned surfaces in §5.3(c) and (d) are exactly where it could hide. I cannot verify a mechanism exists to detect citations in `frontend/src` comments or skill frontmatter because the scanner’s grammar was copied verbatim only for the walked paths; extending it requires a run I have not performed. The reverse-direction gap (§5.3d) is a live defect: the gate checks existence but not sections of six external files, so those `§N` are unvalidated. The dialect problem (§5.3a) is intra-corpus and likely upstream of the renumbering; a normalized heading scheme would prevent category errors (e.g., `adapters/reviewers.md` lettered sections) better than a post-hoc link checker. Prose citations (§5.3b) are completely unmeasured—I have no count and no method, and any claim of absence would be a fiction per §4.2. The next slice (§6) should prioritize dialect normalization over the enforcement-claim sweep, because the former removes the cause; the latter only labels symptoms. The acceptance criterion in §6 is insufficient unless the sweep fails on a newly injected false claim in a separate file, not just re-runs on known text.
