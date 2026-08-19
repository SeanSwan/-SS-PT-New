# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/sspt-atelier-studio/docs/ai-workflow/AI-HANDOFF/ATELIER-BUILD-FINAL-REVIEW-PACKET-2026-08-18.md
**Seed:** (none)
**Tokens:** 9056 in / 2527 out | **Cost:** ~$0.0651 | **Wall:** 65.4s | **finish_reason:** stop

---

# HOSTILE REVIEW — swan-atelier-studio pre-push

## 1. Real code defects

**D1 — `validate()` lets the instrument's core promise through as a string (Artifact 3).**
The skill doctrine says `cost_usd`/`wall_s` are "numbers or null — **never adjectives**." The validator checks only presence:
```js
if (!('cost_usd' in s)) bad.push('cost_usd required (number or null — never an adjective)');
```
`{cost_usd: "cheap", wall_s: "a while"}` **validates clean and gets appended.** The error message asserts a contract the code does not enforce. This is a wrong-accept on the single field the whole "instrument, not vibes" claim rests on. Fix: `(s.cost_usd !== null && typeof s.cost_usd !== 'number')` → defect; same for `wall_s`.

**D2 — `validate()` accepts duplicate `kill_rank` values and duplicate `brief_id`s (Artifact 3).**
Two killed variants with `kill_rank: 1` validate fine — the kill *order* is the data, and nothing enforces it being an order (uniqueness, or even that ranks are 1..k for k kills). Worse, re-running the CLI with the same session file appends a second identical line; no idempotency check on `brief_id`. The "ONE artifact" log silently double-counts sessions, which poisons the v2 shadow study the whole log exists to feed.

**D3 — `--check` in build-archetype-index.mjs does not check the splits (Artifact 4).**
`main()` check-mode compares only `index.json`'s `source_sha`. A hand-edited (or partially deleted) `archetypes/<nn>-<id>.md` split passes `--check` CLEAN. But the D2 exemption in check-brain-links (Artifact 5) justifies itself precisely by claiming splits are "policed for rot by `--check` + archetype-index.test.mjs — a STRONGER freshness proof." That proof does not exist for the split bodies. The exemption's load-bearing justification is nominal, not faithful. Fix: check-mode should regenerate `files` in memory and diff each against disk (content equality, not just sha).

**D4 — D2 exemption is spoofable in one line (Artifact 5).**
`isGenerated` = path prefix + literal first-line marker. Any hand-written file in `archetypes/` whose first line is `<!-- GENERATED from website-archetypes.md` is exempt from the index law forever. The claimed live proof ("rogue hand-written file still FAILS") only proves a rogue file *without the marker* fails. The marker is public (it's in every committed split). The gate is narrow in scope but not in strength. This is acceptable **only** if D3 is fixed — then a spoofed file is caught at the next `--check` run. With D3 unfixed, the spoof survives indefinitely. Also note the posix assumption: `f.startsWith('archetypes/')` — if `mdFiles` is ever built with OS-native separators, every generated split becomes a false-positive orphan on Windows. Verify the path construction upstream; if it's hand-joined, normalize before the prefix test.

**D5 — `fingerprint()` collides on missing fields (Artifact 2).**
Two skeletons both missing `grid` produce `...|undefined` and either falsely collide or falsely pass depending on the other fields. No schema check that the three contract fields exist and are non-empty strings before fingerprinting. The hard gate can be defeated by malformed input rather than by actual divergence. Minor but it's the gate you asked me to verify faithfully — a gate that validates garbage is nominal.

## 2. R2-ruling contradictions

- The hard gate itself (exit 2 halt, exit 3 pre-Sean re-roll legal, fingerprint = contract fields) is faithfully implemented — including the E9 carve-out messaging. ✓
- **Contradiction (soft):** the skill's A5 text says lever state at pick is "recorded in the caption," and the schema makes `lever_deltas` optional on *all* variants including the winner. The doctrine's "heavy lever exploration on a killed variant = free signal" is only realized if deltas are actually logged; schema permits a fully delta-free log that validates. Ruling-adjacent, but the instrument ships half-instrumented.
- **Absence-first:** nothing in the BUILD invokes `fingerprint.mjs` automatically. The gate is a manual CLI step referenced by doctrine prose. Combined with disclosure 5 (no CI), the "HARD GATE" is hard only when someone remembers to run it. A pre-publish hook or a test that fingerprints any `skeletons.json` under `atelier/` is missing — and the rulings required the gate, not a suggestion of the gate.

## 3. Do the disclosures falsify shipped promises?

- **#4 is the dangerous one.** The smoke worked example is cited in the skill as proof of the run loop, but the Plate Forge generator doesn't exist — the pack was hand-made. The skill text handles this honestly ("assets FIRST" is doctrine, smoke is labeled toy). Acceptable, **but** the SKILL.md worked-example section should say "hand-made plates; generator deferred" in-line, not rely on a review-packet disclosure that doesn't ship with the branch.
- #1, #2, #5 are honest v1 fences, explicitly named as doctrine-only. Acceptable.
- #3 (4.01KB vs 2KB) — fine, and the WARN is the right call.

## 4. D2 defeat routes
Covered in D3/D4: (a) marker-spoofed hand file; (b) hand-edited legit split — survives `--check` because only the index sha is compared; (c) path-separator false negatives on Windows. The exemption's *scope* (dir + marker) is as narrow as claimed; its *policing* is not.

## 5. validate() wrong-accept / wrong-refuse summary
- **Wrong-accept:** string cost/wall (D1); duplicate kill_ranks; duplicate brief_id re-append (D2); winner with no `lever_deltas`; `pending` sessions never required to be followed up (a pending entry is indistinguishable from a forgotten one — no staleness concept).
- **Wrong-refuse:** a legitimately re-diverged session after a null-winner round carries `axes_to_flip` — fine — but a *wave-2-only* session (`rounds: 2, wave2_used: true`) re-logging the same `brief_id` has no linkage field to the round-1 entry; not refused, but the log can't reconstruct lineage. Schema gap, not a refusal bug.

## VERDICT: **REVISE**

The two headline fixes you asked me to verify — fingerprint=contract-fields and the hard gate — **are** faithfully implemented (exit codes, E9 carve-out, no-regenerate-post-Sean all correct). But the A5 instrument, the thing Kimi R2 said makes the whole claim non-empty, ships with its core field unenforced.

**Single most important fix:** enforce `cost_usd`/`wall_s` as `number|null` in `validate()` (D1) — one line each — and add content-equality of split files to `--check` (D3), because the D2 exemption's "stronger freshness proof" currently proves nothing about the files it exempts.
