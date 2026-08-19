# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/ATELIER-BUILD-FINAL-REVIEW-PACKET-2026-08-18.md
**Tokens:** 8882 in / 16213 out (reasoning: 14125) | total 25095
**Wall:** 271.1s

---

# HOSTILE REVIEW — feat/swan-atelier-studio @ aa253cfee

## 1 · Built-code defects

**D1 (BLOCKER) — `--check` never verifies the files it exists to verify.** Artifact 4, `if (check)` branch (~l.83–91): it reads *only* `index.json`, compares `existing.source_sha !== srcSha`, prints CLEAN. The 22 split files — the actual exempted artifacts — are never opened. The sha stamp inside each split is decorative; nothing recomputes it. Consequence below in §4.

**D2 (HIGH) — destructive regen on parse drift.** Artifact 4, `main()` (~l.96–99): `rmSync` deletes *every* `.md` in `archetypes/` before writing. If the monolith's heading format drifts (e.g. `## 4 — Title` after a hand edit), the regex yields **zero sections**, the script wipes all 22 splits, writes an empty index — and the next `--check` prints `CLEAN (0 archetypes)`. Total silent recall failure. Guard: abort unless `sections.length` is plausible (>10) before any delete.

**D3 (BLOCKER) — `validate()` does not enforce its own headline rule.** Artifact 3, `if (!('cost_usd' in s))` (~l.55): presence-only check. `"cost_usd": "cheap"`, `"wall_s": "quick"` — literally adjectives — pass. Same hole for `lever_deltas` *values* (`{density: "way denser"}`). The skill ships "numbers or null — **never adjectives**" (Artifact 1, A5); the instrument accepts adjectives. The defect message even recites the rule while not checking it.

**D4 (HIGH) — kill *order* unvalidated in the kill-order log.** Artifact 3, killed-branch (~l.40–42): integer ≥1 per variant, but `[1,1,3]`, `[2,9]` pass. No uniqueness, no contiguity, no requirement that ranks be a permutation of 1..k. The artifact's core semantics is optional.

**D5 (HIGH) — fingerprint gate under-enforces and then lies.** Artifact 2: `wc.every(...)` over an empty array is vacuously `true` (~l.27), so a fleet with **no wildcard** exits 0 printing `"…wildcard alien. Proceed."` — a false statement. Two wildcards are never compared to each other. Neither "exactly one wildcard" nor a fleet minimum (a 1-skeleton input passes as "DIVERGENT") is enforced. The alienness ruling is served only when a wildcard happens to exist.

**D6 (MED) — stale count in a shipped contract.** Artifact 6, design-dialogue block: "the **21** shipped archetypes" — slice 3 added #22; your own evidence line says 22. This is precisely the number-rot class this repo exists to kill, on the branch that added the number.

**D7 (MED/LOW batch):** fingerprint `join('|')` — a `|` inside any field can forge/suppress a collision (Artifact 2, l.14); missing `skeletons` key → raw TypeError, no clean exit (l.44); duplicate variant `id`s and duplicate appends of the same `brief_id` pass (Artifact 3 — double-counted instrument); `pending` rows are append-only with no resolution linkage — a Sean verdict later can never supersede them; BOM-prefixed monolith silently drops archetype #1 from the index (Artifact 4, `/^## /` at offset 0); `slug()` truncation to 4 words with no uniqueness assert on `id`; no `try/catch` on either CLI's `JSON.parse`.

## 2 · Contradictions vs R2 rulings

**None direct.** Verified against every ruling the artifacts themselves cite: E1/E2/E6 single-log — one JSONL, one writer ✓; E9 carve-out — exit-3 message and skill text match ✓; Kimi fingerprint fields — `nav_model|hero_mechanics|grid` exactly ✓; GLM alienness ≥2-of-3 vs *every* non-wildcard — implemented ✓; schema "adopted verbatim + pending" — validate matches the documented shape ✓; Fable D4 — `redact-urls.mjs` shipped with tests ✓. Two *under-enforcements*, not contradictions: D5 (alienness ruling presumes a wildcard; the gate doesn't check existence), and the pack-gate gap in §5. `THIRD_PARTY_NOTICES.md` doesn't exist yet — compliant today, becomes a violation on the first grafted component; note it in A4.

## 3 · The five disclosures

1. **A4/A6 doctrine-only — acceptable cut, dishonest fence.** The v1 fence (Artifact 1) lists five exclusions; A4's "run the token-compatibility check" and A6's "threshold-gated" screenshot-diff are absent from it, and no tooling exists. An agent told to "run" a nonexistent check improvises. Not false *today* (no handover shipped); false at first C13 handover unless the fence is amended. Doc fix.
2. **Lever filtering doctrine-only — acceptable.** With one `pending` entry there is nothing to filter; "consult rejection-log.jsonl" is executable by reading. Not a false promise.
3. **4.01KB index — correct call.** Gutting recall to hit 2KB would be metric-chasing; `~4KB` in Artifact 6 is accurate. Accept.
4. **Plate Forge generator — acceptable.** A0 is agent-executed by design; `plate_pack_id` is schema-enforced. But "Run the pack consistency check" repeats the A4/A6 sin: say "perform," not "run."
5. **No CI — acceptable as disclosed, except it's the load-bearing fact that makes a shipped comment false.** See §4. Disclosure 5 + D1 together mean the D2 exemption's justification has never once been true on this branch.

## 4 · Defeating the D2 exemption

The comment (Artifact 5) claims splits are "policed for rot by `--check` + archetype-index.test.mjs — a STRONGER freshness proof than an index row." Attack:

1. **Poison a live split.** Edit the body of `archetypes/04-fitness-coaching.md`, keep line 1. D2: marker intact → exempt. `--check`: reads only `index.json` (D1) → CLEAN. Tests: no CI (disclosure 5) → never run. Result: a corrupted file on the A7 **hot read path** — Artifact 6 *orders every layout task to load it* — invisible to both gates. Your live "rogue file FAILS" proof only tested a rogue file **without** the marker; it demonstrates the test is narrow, not that it's unspoofable.
2. **Marker spoof.** `printf '<!-- GENERATED from website-archetypes.md @ x -->\n…' > archetypes/99-rogue.md`. First line matches the literal → exempt. One line of preamble defeats the entire exemption.
3. **Unbounded scope.** `f.startsWith('archetypes/')` matches at any depth; combined with (2), shadow docs nest freely.

As built, the exemption is *weaker* than an index row: an index row at least makes the file visible to a scanning human. The comment is a false claim in shipped code — that, not the exemption itself, is the defect.

## 5 · `validate()` — wrongly accepts / refuses

**Wrongly accepts:** adjectives in `cost_usd`/`wall_s` (D3 — the flagship); duplicate and non-contiguous `kill_rank` (D4); duplicate `variant.id`s; duplicate `skeleton_id`s across variants (provenance field is free-text); `lever_deltas` values of any type; `archetype_ids: [""]`; a winner carrying `reason_code`, a survivor carrying `kill_rank` (schema noise); `rounds=1, wave2_used=true` (temporal impossibility).

**Wrongly refuses:** the **A0 pack-gate rejection**. Sean thumbs down the pack → no variants exist → `variants.length < 2` refuses the record. The skill says "Log every session" and calls the pack gate a Sean judgment — the *earliest* taste signal the instrument could capture is structurally unloggable. Also, a legitimate 1-variant wave-2 page can't be logged standalone (defensible if wave-2 must fold into the parent session via `wave2_used`, but the skill doesn't say so).

## 6 · VERDICT

**VERDICT: REVISE**

**Single most important fix:** make `build-archetype-index.mjs --check` regenerate in memory and **byte-compare every split file**, and fail on any missing/extra `.md` in `archetypes/` vs the expected set (exit 2). ~15 lines. This one change converts the D2 exemption's "STRONGER freshness proof" from a shipped falsehood to a true statement, closes the poison-the-hot-read-path route, and — with D3's `typeof s.cost_usd !== 'number' && s.cost_usd !== null` one-liner and the "21→22" fix as ride-alongs — clears every blocker on this branch. The architecture, the rulings compliance, and the disclosure honesty are all sound; the gaps are all enforcement, not design.
