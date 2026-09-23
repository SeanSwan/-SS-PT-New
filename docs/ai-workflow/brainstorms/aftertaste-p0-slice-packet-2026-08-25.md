---
decision: "Post-slice hostile review of P0 Footing (Project Aftertaste) — did the footing actually get fixed, or did it inherit a new class of error?"
status: open
supersedes: none
privacy: IDs/roles only. "Owner" = the human product owner.
---

# SLICE PACKET — P0 Footing (Project Aftertaste) · 2026-08-25

## 0. Your remit

This is a **post-slice** hostile review. The slice is DONE and committed locally; your job is to find what is wrong with it before the next slice (P1, the asset-factory proof) builds on top. Be specific and adversarial. Do not restate the slice back.

**Context you must weigh first — the builder shipped a false fact to a paid panel two hours ago (§1). Assume the same class of error is still present somewhere in this slice and go looking for it.**

Answer in this shape: `## Verdict` (APPROVE / REVISE / REJECT for P0 as a footing to build P1 on) · `## Blockers` (numbered, severity-tagged, each naming the exact §/file and a concrete fix) · `## What the builder's own hostile pass missed` · `## Is P1 safe to start?` (yes/no + what must change first) · `## What I could not verify`.

---

## 1. The error this slice was correcting (read carefully — it is the reason for the slice)

A prior review packet asserted, as a grounded fact in an evidence table, that `world.miniature-play.voxel-realm` **did not exist** in the repo's design-brain world catalog, and that the external plan citing it had "hallucinated a repo anchor."

**That was false.** The entry exists — number 16 of 18 in `docs/ai-workflow/design-brain/worlds.md`, and `scripts/ai-workflow/world-engine-catalog-validation.mjs` carries it in a frozen expected-ID list. The verifying command was `grep -nE "miniature|voxel" <file> | head -8`; entries 14 and 15 produced eight lines before the scan reached entry 16. The cap produced the absence.

Five paid reviewers received the false row. Four turned it into a P0 blocker. One seat's REJECT verdict rested on it. A blueprint, an artifact, a tracker issue, and a learning packet were then built on it — and the learning packet used it as its headline example.

**The same failure class (a truncated instrument reporting a clean/empty result) had been documented in this repo's own learning corpus hours earlier.** It recurred anyway.

**What the real entry contained** — three findings the panel derived from scratch were already repo doctrine inside it:
- *"beveled voxels with disciplined roughness, not plastic cubes"* + `Minecraft likeness` on its banned list = the panel's "voxel is the authoring dialect, not the draw dialect" art law.
- An asset-provenance clause requiring generator/model/version, seed, licenses, SHA-256, and a similarity review excluding *"protected game assets, characters, UI, audio, trademarks, and real likeness"* = the panel's generator-license finding.
- A proof/action contract: the action is *"never awarded or unlocked by play"*; *"no gameplay gates proof or action"* = the panel's souvenir-not-gate rule.

**And one constraint no seat saw:** Voxel Realm is **Law B (Licensed Departure)** — *"No Swan-branded surface may use this Law-B chrome"*; audience fit *"disqualify Swan chrome"*; licensed subset = *"non-Swan campaign microsites, gaming/education client demos, and factory/internal experiments only."*

---

## 2. What P0 shipped (commit `e5f707d88`, 13 files, +1182 lines, local only — not pushed)

Branch `claude/aftertaste-p0-20260825` cut fresh from `origin/main` in a **separate worktree** (`C:/tmp/ss-aftertaste`) because four other agents hold file locks in the shared tree (repo Rule 67, live pair-coding ledger).

1. **`docs/ai-workflow/brainstorms/aftertaste-swanverse-game-blueprint-2026-08-25.md`** — the corrected blueprint. Carries a ⚠ CORRECTION banner as its first section, strikes the false C2 claim, voids the downstream seat findings by name, records the Law-B constraint, and rewrites the P0 roadmap row to say **no new world entry is authored**.
2. **`docs/ai-workflow/brainstorms/aftertaste-voxel-game-panel-packet-2026-08-25.md`** — the original packet, **kept unedited below a correction banner** as the record of what the seats were actually sent.
3. **`docs/ai-workflow/AI-HANDOFF/panel-2026-08-25-aftertaste/`** — five seat outputs verbatim + index.
4. **`docs/ai-workflow/brainstorms/swanverse-game-universe-vision-2026-07-22.md`** and **`swan-badge-companion-progression-2026-07-22.md`** — the lore docs, reaching `main` for the first time. Their absence from main is why an external audit could not see them.
5. **`assets/registry.json`** — new. Single source of asset IDs; modelled on the frozen expected-ID list pattern in `world-engine-catalog-validation.mjs`. Records the inherited Voxel Realm contract (palette law B + the Swan-chrome restriction, proof/action contract, anti-cheese line, banned-likeness list), one zone (`pocket.aftertaste.fallen-food-court`), one skeleton, and the two P1 proof assets with numeric triangle/texture budgets. Enums for status and license (`owner-authored | cc0 | ccby | model:<name>@<version>:<license-id>`).
6. **`docs/ai-workflow/brainstorms/aftertaste-ip-health-sound-onepager-2026-08-25.md`** — new. Three gate sets:
   - **Originality:** banned trade dress and HUD/round-audio conventions; a required IP separation matrix (`name · silhouette · palette · costume · props · voice · catchphrase · story function · nearest 3 commercial comparisons · why distinct`), where an empty "why distinct" cell blocks the asset. **Boss name REJECTED** after a public search — "Ringmaster" is crowded (Marvel since 1941, Dota 2, *The Mimic*, a tabletop title). Archetype re-cast as **a maître d' of rot** — no clown, no ringmaster coat, no big-top.
   - **Health language:** debuffs are named for the environment/material, never the person. Grease Drag → **Slick Footing**; Salt Lock → **Brine Stiff**; Gut Static → **Spoilage Hum**; Sugar Crash kept. No diagnosis as a mechanic, no food as a cure, **the boss no longer force-feeds** (the "open wide" grab is cut — it reads as force-feeding regardless of intent), Avatar-Mirror no-body-morph guardrail carried over.
   - **Sound:** no round sting, no announcer, no wave fanfare; no voiced boss taunts until the IP matrix passes; audio provenance identical to mesh provenance; **silence is the default** (inherited) and the game is fully legible with audio off.
7. **`docs/ai-workflow/hermes-learning-packets/20260825-a-truncated-grep-became-five-reviewers-false-premise.md`** — the learning packet, rewritten around the real failure.

**Verified during the slice:** all 18 world IDs enumerated with no cap; `registry.json` parses and has no duplicate IDs; `assets/` did not previously exist on `origin/main`; the two RPG docs already on main were byte-identical (line-ending noise only) and were restored rather than overwritten; pre-commit secret scan CLEAN on 13 staged files; frontend guards CLEAN (0 frontend files).

**Explicitly NOT done:** nothing installed (no Blender, MagicaVoxel, gltf-transform, R3F); nothing pushed; no production surface touched; no code written.

---

## 3. The builder's own hostile findings (attack these too — and find what they missed)

- **B1.** The learning packet now claims the durable lesson, but the *procedural* fix is a habit ("never `head` an enumeration behind an absence claim"), and habits are exactly what failed last time. There is **no deterministic guard** — no hook, no lint, nothing that catches the next capped grep. Writing it down is what already didn't work.
- **B2.** `assets/registry.json` is a schema with **no validator**. `validate-asset.mjs` is described in the blueprint and does not exist. A registry nothing enforces is a document, not a gate — and P1's exit criterion is "the validator rejects, then accepts."
- **B3.** The blueprint is now internally layered: an original body plus a correction banner that voids parts of it. A future reader who skims may act on a struck claim. Should the body be rewritten instead of annotated?
- **B4.** The Law-A/Law-B fork is *recorded* but *undecided* (§13 decision 5). P1 authors a companion-stage app asset — which is a **Swan-chromed** surface, so it must be Law A — while the enemy is a Voxel Realm (Law B) asset. **P1 therefore straddles both palettes on its very first two assets.** Is that a proof of the pipe or a proof of nothing?
- **B5.** The boss name is rejected but no replacement exists, and no name-search procedure is scheduled. That blocks concept art, which blocks the enemy asset's identity — is the P1 proof asset (a Fryling, not the boss) actually independent of it?
- **B6.** Budgets in the registry (1500/700/300 tris, 4 MB) are **priors carried from an unverified panel estimate**, not measured. They are now written into a file that a future validator will enforce. That is a fabricated number acquiring authority by being committed.
- **B7.** Nothing is pushed, so `origin/main` still lacks the lore docs — the exact condition that caused the original external audit to miss them. The fix is committed, not landed.

---

## 4. Questions the panel must answer

1. Is the correction **complete**, or does a claim downstream of the false premise still survive somewhere in the blueprint, registry, or one-pager?
2. Given B1 — what is the **cheapest deterministic guard** that would have caught a `head`-capped absence claim before it reached a paid reviewer? Name a concrete mechanism, not a discipline.
3. Given B4 — should P1's second asset be a **non-Swan** asset instead of a companion stage, so both proof assets sit in one palette law? Or is straddling both laws the actual point?
4. Given B6 — should the registry's budget numbers be **null until measured** (failing validation loudly) rather than plausible-but-unverified?
5. Is `assets/registry.json` the right shape, or should it follow the existing `world-engine-catalog-validation.mjs` pattern more literally (a frozen JS list + a test) so it is enforced from the start?
6. What did the builder's hostile pass **not** look for at all?
7. **Is P1 safe to start?** If no, name the single smallest thing that must land first.
