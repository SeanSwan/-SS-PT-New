# Graphify Policy — Integration, Quarantine, Promotion

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for all Graphify use in the SwanStudios knowledge system
- **Stance:** quarantine-first (see `index.md` §1). Graphify is T1; import/promotion is human-reviewed (operator bridge §3).

---

## 1. Preconditions — do not run Graphify unless

1. **It is actually installed and safe.** Verified install, known version, run against local files only, no network egress of vault content. If installation/safety is unverified, the answer is `[UNKNOWN] — Graphify gate unavailable`; do not claim graph coverage and do not improvise a substitute (the rule-63 pattern applied to graph tooling).
2. **The question is a chain question.** Graphify earns its cost only when relationship CHAINS matter — multi-hop questions like "which surfaces use pattern C11 → which decisions constrain C11 → which of those decisions have expired review hooks?" Flat lookups ("where is the palette defined?") are search jobs; running a graph for them is misclassification (registry §4: vending machine before slot machine).
3. **Input scope is deliberate.** A named, bounded set of source docs chosen for the question at hand. **Never inject hundreds of files blindly** — a whole-repo or whole-vault ingest is a policy violation, not a thorough run.
4. **Inputs are PII-clean.** IDs/roles only (rule 8); no raw transcripts, no client names, no secrets. Graphs multiply exposure by linking things.

## 2. Run mechanics — standalone first, quarantine always

1. **Create standalone Graphify output first.** The run writes to its own output directory, never directly into vault lanes or the repo.
2. **Quarantine everything** under vault `graph-imports/` (lane defined in `../obsidian/vault-routing.md` §1): the graph export plus one **concept stub per node worth keeping** using the stub template in `templates.md`, each marked `status: quarantined`.
3. **Wire concept stubs back to source docs** at import time: every stub lists the exact source documents (repo path or vault path) it was derived from. A stub without sources is deleted, not fixed later.
4. **Record per import:** source set, the question/reason the run served, run date, who ran it, and (later) the promotion decision. This record lives in the import's folder alongside the stubs — the `graph-imports/` index.md law (§2 of vault-routing) requires it.
5. Nothing in quarantine is citable, surfaced in command-center panels without a QUARANTINE label, or linked from `wiki/` pages.

## 3. Promotion — the only exit from quarantine

Promote a concept into `wiki/` only when **every** box checks. Promotion is per-concept, human-reviewed (Sean or a Fable pass Sean has delegated), never per-batch:

- [ ] **Provenance recorded** — full frontmatter per `templates.md`, including source docs, run id, created-by, and the promotion decision + date
- [ ] **Source wired** — the promoted note cites its origin docs and the originating run/receipt per the source-wiring template; a reader can verify every claim against a source without the graph
- [ ] **Usefulness demonstrated** — the concept answered a real question at least once (cite the thread/run), or fills a named gap in `wiki/`; "the tool generated it" is not usefulness
- [ ] **No PII** — clean under rule 8 scan, including in relationship/link text
- [ ] **Removable cleanly** — deleting this note breaks nothing: no repo doc depends on it, `wiki/` links to it are additive, and its removal path is one delete + one link sweep

Rejected concepts get `promotion: rejected — <reason>` in their stub and stay quarantined until the import is pruned. Silence is not rejection; undecided stubs stay undecided and uncitable.

## 4. Keep imports removable

- Each import batch stays in its own dated folder under `graph-imports/` so an entire run can be removed with one folder delete.
- Promoted notes live in `wiki/` as ordinary notes that happen to have graph ancestry — the graph tool can be uninstalled tomorrow and every promoted note still stands on its wired sources. **If a note only makes sense inside the graph tool, it was never promotable.**
- Retire stale imports on the vault's retention rhythm; retirement of quarantined material needs no approval beyond the import record note (it was never citable), but follows rule-34 discipline: reference-check before delete, no "guaranteed deletable" language.

## 5. Verification before done (any Graphify run or promotion pass)

- [ ] §1 preconditions logged: install verified, chain question named, bounded input set listed, PII scan clean
- [ ] Output landed standalone → `graph-imports/<date>-<slug>/`; zero direct writes to `wiki/`, repo, or other lanes
- [ ] Every kept stub uses the template, wired to sources; import record (source/reason/date/runner) present
- [ ] Promotions (if any): full checklist evidenced per concept; decisions recorded in the stubs
- [ ] Everything unpromoted still labeled quarantined; nothing quarantined cited anywhere
