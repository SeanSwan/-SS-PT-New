# BRANCH GATE PACKET — Project Aftertaste, 6 commits · 2026-08-25 — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/brainstorms/aftertaste-branch-gate-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 3883 in / 7055 out | **Cost:** ~$0.0043 | **Wall:** 222.1s | **finish_reason:** stop

---

## VERDICT
REVISE — the branch improves evidence hygiene but ships a fail-open (and possibly inactive) pre-commit guard, an unverified Blender pipe, and a registry whose critical constraint fields are never enforced, leaving the "gate" as an honour system.

## BLOCKERS
1. P1 — truncated-evidence-guard.mjs fails open on its own errors: any exception in the guard (e.g., unreadable staged file) returns exit 0, allowing a commit containing a false absence claim + truncating instrument to pass. File: scripts/hooks/truncated-evidence-guard.mjs (117 lines, §2.1 "Fail-open on its own errors").
2. P1 — Hook activation path unverified: guard is placed at `.githooks/pre-commit` but the document never shows `git config core.hooksPath=.githooks`; with default git the hook never executes, so the entire evidence guard is inert. File: .githooks/pre-commit (referenced in fa25b9e82, §2.1).
3. P1 — Registry constraint fields unenforced: `chromeLaw` (Law-A/Law-B: Voxel Realm chrome must not touch Swan-branded surface) is declared in assets/registry.json but no validator reads it; a future manifest can violate the very constraint that triggered the P0 correction. File: assets/registry.json (§2.1 "Nine fields declared and never read") + validate-asset.mjs (292 lines, §2.1).
4. P2 — swan_pipe.py is UNRUN with unverified background-mode calls (`uv.smart_project`, `export_scene.gltf` per docblock); first real execution may crash or emit broken GLB, and the emitted manifest stub is deliberately invalid. File: tools/blender/swan_pipe.py:1-269 (§2.1).
5. P2 — `similarityReviewed: true` is honour-only: validator requires the boolean but stores no reviewer/date/comparison artifact, so a self-attested true passes. File: validate-asset.mjs (§2.1, F2).
6. P2 — Provenance is shape-not-truth: `{tool, command, date, commit}` accept `"command":"echo ok"`; `git cat-file -e <commit>` is not performed. File: validate-asset.mjs (§2.1, F3).

## ATTACKS
- Correctness: happy-path-only logic — `swan_pipe.py` and the proof fixture (single hand-authored triangle) never exercise real Blender export paths; null/undefined handled for `aiAssisted` but `__proto__` only in selftest; stale state risk from mutable registry (F4); no race-condition testing for concurrent registry edits; off-by-one avoided in measure-glb but unverified for STRIP/FAN edge cases; unhandled error paths: hook fail-open (above), `swan_pipe.py` raises only on `.vox` but otherwise unverified.
- Security: authn/authz/IDOR not applicable to local scripts; injection — provenance command strings are stored not executed, so no RCE, but a malicious manifest could lie about command; SSRF/secret handling none; replay/idempotency none; multi-tenant scope leaks — worldId resolved against frozen list mitigates; rate-limit/DoS — asset size/path limits good, but hook fail-open weakens supply-chain integrity (a form of DoS on truth).
- Data-truth / schema drift: model column vs caller field drift — nine registry fields (`chromeLaw`, `bannedLikeness`, etc.) declared but zero readers (F1); PascalCase-vs-snake_case not observed; FK target drift — zone FK namespacing fixed per panel; frontend response-shape drift — no frontend in branch, but `validate-asset` output shape not consumed by any UI yet.

## HIGHEST RISK
The fail-open (and possibly inactive) pre-commit hook is the most dangerous item: the branch’s entire reason is to stop false absence claims, yet if the guard crashes or is never invoked, every other fix is moot and a false claim can enter `main` silently. Cheapest de-risk before ship: change the guard to fail-closed (any unexpected exception → exit 1) and add a CI step that asserts `git config core.hooksPath` is set (or copies `.githooks/pre-commit` to `.git/hooks`) before allowing push.

## CONFIDENCE
I could NOT verify from the document alone: (1) whether `.githooks/pre-commit` is actually wired via `core.hooksPath` or symlink — repo `.git/config` or CI log would settle it; (2) exact line numbers for the described logic — only file/line-count given; (3) that `world-engine-catalog-validation.mjs` frozen list matches `registry.json` worldIds — diffing the two files would settle; (4) whether `swan_pipe.py` runs without error in Blender 4.5 LTS headless — a 10-line smoke export is needed; (5) any frontend code violating styled-components/Victory/44px/WCAG rules — none present in this branch, but other branches may; (6) the credential phrase "NASM-protocol" vs "NASM-certified" — not used here, so no violation observed. House-rule check: no UI components, charts, or credential text in the reviewed document, so no violations detected; if any hidden UI exists it is out of scope of this packet.
