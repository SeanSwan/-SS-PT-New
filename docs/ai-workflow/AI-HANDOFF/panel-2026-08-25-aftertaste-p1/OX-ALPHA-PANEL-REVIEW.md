# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-p1-slice-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 2896 in / 4434 out · **Cost:** ~$0.0000 · **Wall:** 116.5s · **finish:** stop

---

## VERDICT
REVISE — the validator is genuinely well-designed and the honesty about unrun code is commendable, but the slice's headline deliverable (~230 lines of `bpy`) has never executed, nothing is pushed to the tree where the original failure occurred, and the validator proves *structure*, not *truth*.

## BLOCKERS

1. **P1 — The Blender pipe is fiction until it runs once.** `tools/blender/swan_pipe.py` (~230 lines, §2.2) is written "against the 4.5 LTS API" from memory and has zero executions. Concrete failure scenario: first real run hits any of the classic bpy drift points (`bpy.ops.object.shade_smooth()` vs `use_auto_smooth` removal in 4.x, bevel modifier input naming, bake target API changes) and the entire voxel→GLB path fails at step 2 of 9. The slice cannot be accepted as "produces working code" when its central translation layer is unexecuted. Fix: N1 — install Blender, run one real asset, before anything else builds on this.

2. **P1 — All guards are branch-local; the vulnerable tree is unprotected.** §2: "Still not pushed — origin/main lacks all of it," and §B6 concedes the shared tree where the false-grounded-fact failure happened has none of the P0/P1 guards. Failure scenario: any other agent works off `origin/main` tomorrow and repeats the truncation-class error because the catalog-validation guard exists only on `claude/aftertaste-p0-20260825`. Fix: push + open PR immediately; this is hours of work masquerading as a scheduling decision.

3. **P1 — Provenance fields are validated for shape, never for truth.** §2.1 accepts `{tool, command, date, commit}` as opaque strings. Failure scenario: a future manifest carries `"commit": "deadbeef", "command": "echo ok"` — structurally perfect, factually fabricated — and exits 0. The validator's entire reason to exist (per §1's calibration against fabricated facts) is defeated by a hand-typed four-field object. Cheap fix: shell out to `git cat-file -e <commit>` and optionally re-run `command` in a sandbox to compare the emitted hash. Until then, "the first non-fabricated number in the repo" (§2.3) is true only because the builder is honest today.

4. **P2 — Runtime-path resolution is traversal-open and untested.** R1 fixed the `--all` central-dir bug by making paths manifest-relative, which implies the validator opens whatever path the manifest declares. Failure scenario: manifest declares `runtimePath: "../../../.git/config"` or an absolute path → validator happily hashes and "validates" a file outside the asset namespace, and worse, a crafted manifest could make an arbitrary repo file satisfy the "missing runtime file" check. The dry-loop's five rounds never attacked path shapes. Fix: resolve manifest-relative, then assert the resolved path is contained within the manifest's directory; reject absolute paths and `..`.

5. **P2 — File-size cap compliance is asserted, not demonstrated.** §B5: validator is "~300 lines" against a hard ≤300 cap. "~300" is not a number. If it's 301, this is a standing house-rule violation in the very slice that built the enforcement culture. Fix: state the exact count; split now if at/over rather than waiting for the next feature to force it.

## ATTACKS

**Correctness**
- **Triangle-budget counting likely assumes TRIANGLES mode.** §2.3 derives the budget from "accessor count read out of the GLB's JSON chunk." A primitive with `mode: 4` (strips), fans, POINTS/LINES, or non-indexed accessors will produce a wrong count under naive index arithmetic. First real exported mesh with a line-list for outlines silently books a garbage budget row. Test with a multi-primitive, mixed-mode GLB.
- **Degraded mode semantics are underspecified.** R4 says degraded mode "warns rather than silently passing" — but exits with what code? If it exits 0 with a stderr warning, any CI that doesn't fail on stderr waves unvalidated assets through. Pin it: degraded = exit 2, always.
- **Selftest isolation:** `--selftest` "runs with no repo assets" — confirm it doesn't accidentally read a real `assets/registry.json` if invoked from repo root, making selftest results environment-dependent.
- **Regressions locked by fixtures?** The `aiAssisted: null` bug (R1) was found and fixed, but nothing stated confirms one of the 11 fixtures pins `null` specifically. Without that fixture, the exact same `!== undefined` bug returns in the next refactor.

**Security**
- Path traversal (Blocker 4).
- **Prototype pollution:** a Node-based validator merging manifest JSON is exposed to `__proto__`/`constructor` keys overriding defaults (e.g., injecting `__proto__: {similarityReviewed: true}` depending on merge implementation). One fixture costs nothing.
- **Symlink/special-file handling:** a symlinked runtime file or a FIFO passed as `runtimePath` — sha256 read behavior undefined.
- **DoS-by-manifest:** no stated size cap on files hashed; a 40GB path in a manifest hangs the gate.
- **Registry write-path authority:** nothing in the packet says who may edit `assets/registry.json`. If the generating agent can edit both registry and manifest, the "gate" is self-attestation with extra steps. Document the human-signoff rule for registry mutations.

**Data-truth / schema drift**
- **The chain of trust terminates at unverified strings** (Blocker 3). Relatedly: does the validator cross-check the manifest's declared clip set against the *same* frozen world catalog it uses for zone ids, or are those two independently-maintained lists already drifting?
- **B7 answered directly:** the 1-triangle ledger row does *not* poison the ledger — it's true, dated, and committed. What poisons ledgers is fabrication, not small samples. But mark it explicitly as a calibration fixture row in the manifest, or six months from now someone trend-lines it as if it were production data.
- **§1's own anchor claims are secondhand to me:** I cannot verify `world.miniature-play.voxel-realm` exists at worlds.md entry 16, nor that the frozen expected-ID list contains it. Given this project's history, every repo anchor cited in this packet should be grep-verified by a seat other than the builder's.

## HIGHEST RISK
The most dangerous item is **Blocker 1 compounded by Blocker 2**: unrun, unpushed code that the rest of the plan will treat as a working foundation. Every downstream slice that assumes "voxel → GLB works" inherits a fiction, and the repo's documented worst-failure class ("looks right, never ran") is live in the flagship artifact.

Cheapest de-risk, which doubles as my **next-slice answer: N1**, with N2 executed as a same-day precondition rather than a competing slice. Concretely: (a) push the branch and open the PR *today* — it needs the Owner for five minutes, not a slice; (b) install Blender + gltf-transform only (cut MagicaVoxel — the pipe can't read `.vox` anyway per B3, so installing its editor buys nothing this round); (c) run ONE real voxel-authored asset through the full pipe to LOD1, cutting LOD2 and the collision proxy from the slice. Why N1 beats N4: the Owner's stated priority is a repeatable asset factory, and right now the factory's core machine has never turned over — N4's fun probe answers a question about a game that is explicitly DEFERred. Why it beats N3/N5: optimize.mjs and `.vox` support are both meaningless to build against a pipe that has never produced a GLB. N1 converts B1/B2/B3 from three open doubts into three facts, and either outcome is progress.

## CONFIDENCE
I could not verify, from the document alone:
- **That the code matches its description.** I have no file contents — every claim about exit codes, the null-fix, the `--all` fix, and the 11 fixtures is the builder's self-report. Exact line count of `validate-asset.mjs` (Blocker 5) is a 10-second `wc -l`.
- **The repo anchors** (worlds.md entry 16, the frozen expected-ID list, commit `a7a0a3801`). Given §1, these need independent grep/git verification, not builder assertion.
- **Whether the 11 selftest fixtures include regressions for the specific bugs R1 found** (`aiAssisted: null`, manifest-relative resolution). Evidence: the fixture list.
- **bpy 4.5 API accuracy** — I share the builder's epistemic position here: neither of us has executed it. Only a real run settles it, which is precisely why it's my next-slice pick.
- **Whether "degraded mode" exits nonzero** — one sentence in the script header would settle it.

My confidence is moderate-high on the structural criticisms (provenance-shape-vs-truth, path traversal, unrun-code risk) because those follow from the described design regardless of implementation details; it is low on anything requiring the actual diff.
