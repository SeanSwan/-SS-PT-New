---
decision: "Six-seat hostile gate on the ENTIRE Aftertaste branch before it is pushed and before Blender + gltf-transform are installed — the Owner has approved both and wants the review first"
status: open
supersedes: none (this is the gate review; the three prior packets were per-slice)
privacy: IDs/roles only. "Owner" = the human product owner.
---

# BRANCH GATE PACKET — Project Aftertaste, 6 commits · 2026-08-25

## 0. Why you are here

The Owner has just approved: **push the branch**, **install Blender 4.5 LTS + gltf-transform**, and proceed. He asked for this review to run **before** any of that happens. You are the last gate. If something here is wrong, it lands on `main` and becomes the foundation the next slices build on.

This is a **whole-branch** review, not a per-slice one. Three per-slice panels already ran today and every finding they produced was either fixed or logged (§4). Your job is different: **what survives all of that?** What did three panels and eight dry-loop rounds collectively fail to see? What is wrong with the *shape* of the whole, not just the parts?

Answer in this shape: `## Verdict` (SHIP / SHIP-WITH-FIXES / HOLD — for pushing this branch as-is) · `## Blockers` (numbered, severity-tagged, exact file + concrete fix) · `## What three panels missed` · `## Install go/no-go` (is Blender + gltf-transform the right install set, and is `swan_pipe.py` fit to be the first thing run?) · `## What I could not verify`.

**Seats:** Ox Alpha · Kimi K3 · HY3 · Grok 4.6 · DeepSeek V4 Pro · Fable (the builder, reviewing its own work adversarially and putting its findings beside yours, attributed and attackable).

---

## 1. Calibration — the error class this branch is built against

This morning a review packet asserted, as a grounded fact in an evidence table, that `world.miniature-play.voxel-realm` did not exist in the design-brain world catalog and that the external plan citing it had hallucinated. **It exists** — entry 16 of 18, carried in a frozen expected-ID list in `scripts/ai-workflow/world-engine-catalog-validation.mjs`. The verifying command was `grep -nE "miniature|voxel" <file> | head -8`; entries 14 and 15 filled the cap. Five paid seats received the false row; four made it a P0 blocker.

The same failure class recurred **four more times** across the day (a misread `EXIT 2` reported as a pass; a test matrix whose fixtures were written where Node could not see them, so nine rows all read exit=0; a tamper test on a byte that was already zero; a blanket "written against the 4.5 API" claim covering calls never checked). Each was caught by an outside seat or by accident, never by the discipline that had just been written up.

**Assume the same class is present somewhere in this branch and hunt for it.** The builder's own tests encode the builder's assumptions.

---

## 2. What the branch is (6 commits, ~2,950 insertions off `origin/main`)

| Commit | Slice | What |
|---|---|---|
| `e5f707d88` | P0 | Panel record (packet + 5 seat outputs), the corrected blueprint, the two Swanverse lore docs reaching main for the first time, `assets/registry.json`, an IP/health/sound one-pager |
| `fa25b9e82` | P0 panel | `catalog-check.mjs`, `truncated-evidence-guard.mjs` wired into `.githooks/pre-commit`, registry fixes (zone FK namespacing, structured license, budgets nulled) |
| `0b4253d77` | dry-loop | guard made file-scoped; superset caveat on `.md` scans |
| `a7a0a3801` | P1 | `validate-asset.mjs`, `swan_pipe.py` (UNRUN), a real reject→accept proof on hand-authored glTF bytes |
| `528dc1c20` | P1 panel | path containment, correct triangle unit (`measure-glb.mjs`), import-safe modules, degraded mode → exit 2, selftest 11→16 |
| `8d6b36ea5` | tick | `shade_auto_smooth` replaced with an asset-free bmesh equivalent; per-call API audit in the docblock |

### 2.1 The tools (all under `scripts/assets/` unless noted)

- **`catalog-check.mjs`** (121 lines) — enumerates a catalog (`.json` / `.mjs` / `.md`) with no truncation, always prints the total. Exit 1 = absent (the only exit that licenses an absence claim). Exit 2 = instrument failure (zero ids enumerated is never evidence of absence). On `.md` it warns that the scan is a superset — ABSENT is strong, PRESENT is weak.
- **`scripts/hooks/truncated-evidence-guard.mjs`** (117) — pre-commit. Blocks a staged doc whose **added lines, anywhere in the file**, contain an absence claim AND a truncating instrument (`| head`, `| tail`, `sed -n`, `grep -m`, `--max-count`, `LIMIT`, `.slice(0,N)`) AND no denominator. Escape hatch `EVIDENCE-OK: <reason>`. Fail-open on its own errors. File-scoped because a ±6-line window missed a claim 10 lines from its evidence.
- **`validate-asset.mjs`** (292) — the gate. Refuses: id not in registry · flat zone id (must be `<worldId>/<localId>`, worldId resolved against the **frozen** list, never prose) · clip outside skeleton set · budget without `{tool, command, date, commit}` · Draco on rigged · free-text or delimited license · `aiAssisted` not a real boolean · `similarityReviewed !== true` · runtime path escaping the manifest dir, absolute, symlink, or over 256 MB — **refused before any read** · missing file · sha256 mismatch. Exit 2 on missing/malformed registry, zero manifests, or absent world catalog (`SWAN_ALLOW_DEGRADED=1` to override knowingly).
- **`validate-asset.selftest.mjs`** (83) — 16 fixtures, no repo assets needed. Includes regression pins for every defect found by running rather than reading: `aiAssisted: null`, `aiAssisted: "false"`, traversal, absolute path, `__proto__`.
- **`measure-glb.mjs`** (184) — triangle count from a GLB honouring `indices` and primitive mode (TRIANGLES n/3, STRIP/FAN n−2, POINTS/LINES 0); embedded texture bytes. 8 fixtures incl. an indexed 40k-tri case. Import-safe.
- **`tools/blender/swan_pipe.py`** (269) — `blender -b --python`. obj/glb → weld → limited dissolve → BEVEL → bmesh smooth-by-angle → UV → LOD0/1/2 → GLB → deliberately-INVALID manifest stub. **UNRUN.** Per-call audit in the docblock: `wm.obj_import`, `bmesh.ops.remove_doubles`, `bmesh.ops.dissolve_limit`, BEVEL+`modifier_apply` → OK by documentation; `uv.smart_project` kwargs → UNVERIFIED; `export_scene.gltf` in background mode → UNVERIFIED (upstream issue 83188). `.vox` is NOT supported — it raises and tells the user to export `.obj`.
- **`assets/registry.json`** — single source of asset IDs. One zone (`world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court`), one skeleton, two planned assets with `budgets: null` and advisory `budgetPriors` (one carrying a sanity flag: 4 MB texture on a 1500-tri prop is implausible). License policy is a structured object. **Nine fields are declared and never read by any validator:** `chromeLaw`, `bannedLikeness`, `lawBRestriction`, `proofActionContract`, `antiCheese`, `shardFraming`, `loreParent`, `idRule`, `statusValues`.
- **`assets/runtime/enemy/fryling/`** — the proof: four real single-triangle glTF 2.0 binaries (container verified: magic, version 2, declared length == actual), a still, and a manifest that VALIDATES with a budget measured by `measure-glb.mjs` and marked `calibrationFixture: true`.

### 2.2 The docs
- The blueprint carries a ⚠ CORRECTION banner as its first section, voiding the false-anchor findings by name. The original packet is kept unedited under a banner; every seat output and the index carry void-premise banners.
- IP/health/sound one-pager: boss name **rejected** after search ("Ringmaster" is crowded), archetype re-cast as a maître d' of rot **marked provisional pending its own search**; debuffs renamed environment-first (Slick Footing / Brine Stiff / Spoilage Hum); no force-feeding; sound gates (no round sting, no announcer, silence by default).
- Three learning packets on the day's failures.

---

## 3. The builder's (Fable's) own adversarial findings on the whole — attack these and rank them against yours

- **F1 — The registry is half gate, half document.** Nine declared fields, zero readers. The most important of them, `chromeLaw`, encodes the Law-A/Law-B constraint that the whole P0 correction surfaced (Voxel Realm chrome may not touch a Swan-branded surface). Nothing enforces it. A future asset can violate the constraint that justified the correction.
- **F2 — `similarityReviewed: true` is an honour flag.** The validator requires it to be `true` and then trusts it. There is no artifact — no reviewer, no date, no list of what it was compared against. Voxel Realm's provenance clause names *what* the review must exclude; this field records only that someone typed `true`.
- **F3 — Provenance is shape, never truth.** `{tool, command, date, commit}` are opaque strings. `"command": "echo ok"` passes. The one cheap truth check available — `git cat-file -e <commit>` — is not done.
- **F4 — The registry is a mutable root of trust with no write control.** An agent that can edit both `registry.json` and a manifest can "register" anything. The gate is self-attestation with extra steps unless registry diffs get human review.
- **F5 — The guard protects `docs/` and `.ai-workflow/` only.** A false absence claim in a commit message, a code comment, a Linear issue, or a chat reply is unguarded. The original error reached reviewers through a packet in `docs/`, so the scope matches the incident — but not the class.
- **F6 — `swan_pipe.py` emits `"compression": "none"` and the validator only checks compression when it is `draco`.** Nothing in the branch *produces* compressed output; `optimize.mjs` (gltf-transform) does not exist. The install set the Owner approved includes gltf-transform, but no script calls it.
- **F7 — The proof fixture proves plumbing, not the pipe.** One non-indexed triangle, hand-authored. It cannot fail in any of the ways a Blender export can. The first real run is the first real test.
- **F8 — Push safety — CHECKED, not assumed.** `origin/main` has moved **18 commits / 60 files** since the worktree was cut (merge-base `08215328c`). Overlap with this branch's 26 files: **0** (explicit `comm -12` count, not a silent empty pipe). Commits on `main` touching `.githooks/pre-commit` since the merge-base: **0**. So a rebase should apply clean and the guard lands on the hook as it was. What is NOT checked: whether any of those 18 commits added a *new* pre-commit stage whose behaviour interacts with the guard's (fail-open, docs-only scope) — a zero file overlap does not prove zero behavioural overlap.
- **F9 — Line-cap compliance is at the edge again.** `validate-asset.mjs` is 292/300. The next panel fix pushes it over. `swan_pipe.py` is 269.
- **F10 — Three learning packets say "instrument-check reinforced" and the failure recurred after each.** The corpus is recording the lesson faster than the builder is learning it. The only things that actually held were tools (`catalog-check`, the hook) — is there a *fourth* place a tool should replace a discipline, before the next recurrence?

---

## 4. What the three per-slice panels already found and closed (do not re-find; DO check the fixes)

| Panel | Found | Closed by |
|---|---|---|
| P0 (Ox/GLM/HY3) | zone FK not namespaced · license delimited string · budgets fabricated · correction never reached tracker/artifact · seat outputs had no void marker · boss re-cast unsearched · guard was discipline not mechanism | `fa25b9e82` + `0b4253d77`: all fixed; guard built and wired |
| P1 (Ox/GLM) | **path traversal** · **wrong triangle unit** (fixture hid it) · degraded mode exited 0 · no regression fixture for the null bug · line cap · provenance shape-not-truth (→ F3, open) · registry mutable (→ F4, open) | `528dc1c20`: first five fixed and proven; last two carried as F3/F4 |
| tick (self) | `shade_auto_smooth` depends on a geometry-node asset with open headless failure reports | `8d6b36ea5`: bmesh replacement |

---

## 5. Questions

1. **SHIP / SHIP-WITH-FIXES / HOLD** for pushing this branch to `origin` now — and which of F1–F10 (or your own) must be fixed **before** the push vs can ride behind it?
2. Given F8: what is the **minimum safe push procedure** for a branch that modifies a shared pre-commit hook under four active agents?
3. Given F6: should gltf-transform be installed *now* with nothing calling it, or deferred until `optimize.mjs` exists? Is the install set right?
4. Is `swan_pipe.py` fit to be the **first thing executed** after Blender lands — or should a 10-line smoke script (import obj → export glb, nothing else) run first to isolate `export_scene.gltf`-in-background from everything else?
5. F1/F2/F3/F4 together: is this registry+validator a **gate**, or an **elaborate honour system**? What is the single cheapest change that makes it the former?
6. What is wrong with the *shape* of the whole branch that no per-slice review could see?
