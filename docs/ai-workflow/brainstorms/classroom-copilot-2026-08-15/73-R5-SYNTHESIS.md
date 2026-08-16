# Round 5 — GLM 5.3 + Kimi K3 hostile & security review: synthesis

**Date:** 2026-08-16 · Unlensed, Rule 82 · Cost: GLM $0 (subscription) + Kimi $0.2021 = **$0.20**
**Replies:** `71-glm-r5.md` (523s, 31,092 out — not truncated) · `72-kimi-r5.md` (293s, 10,971 out)
**Review target:** the orchestrator's own decisions — the least-reviewed material in the project.

---

## 0. Headline

**The strike-derivation claim is destroyed, by both models, independently, on the same two
grounds.** It was my claim, published in the blueprint as *"no new field needed."* That is wrong.
The idea underneath it — count escapes, not catches — survives; the mechanism does not.

Both models also independently found that **the Round-4 critical fix is only half-applied**:
`allowBackup="false"` is ignored on Android 12+ unless `dataExtractionRules` is also shipped. Her
phone runs Android 14. The leak we believed we had closed is still open.

---

## 1. Verified real defects — I confirmed each against the blueprint myself

| # | Defect | Found by | Status |
|---|---|---|---|
| R1 | **No `HANDOFF`/`HANDOFF_ITEM` tables** — a handoff is logged per *child*, corrections per *record*; the join the strike rule needs does not exist | both, independently | **confirmed absent** |
| R2 | **No monotonic ordering.** `RECORD_EVENT.id` is a uuid; ordering rests on `at_ut`, a wall clock that moves backwards on NTP correction. Failure direction converts real escapes into "caught in review" | both | **confirmed absent** |
| R3 | **No `dataExtractionRules`.** `allowBackup=false` alone is insufficient on API 31+; cloud-backup *and* device-transfer must both be excluded, and verified against the **merged release manifest**, not the source | both, independently | **confirmed absent** |
| R4 | **Security floor sits in S12.** App-lock, `FLAG_SECURE`, biometric gating arrive last — so S1–S11, the entire period real child data first enters the device, runs with no second factor and record content visible in the app switcher | both | **confirmed** |
| R5 | **`CAPTURE.raw_text` "retained always"** contradicts the data-minimisation argument the retention decision rests on. The raw dump is the most sensitive artefact in the system — it contains everything she said, including fragments never made into records | both | **confirmed present** |
| R6 | **`scratch` has no field.** The opt-in early-deletion decision is unimplementable as written | Kimi | **confirmed absent** (my own grep matched decision *prose*, not a schema field — verified by reading the RECORD entity) |
| R7 | **`wrong_child` and `child_corrected` are two events for one fact.** Strikes should be *computed*, not emitted | Kimi | **confirmed present** in the event enum |

## 2. My packet was contradictory, and some "critical" findings are mine, not the design's

GLM's top finding was *"the blueprint contradicts itself in three places, and a builder following
Part 3 will build the rejected rules"* — citing `+30d`, permanent-death, home-Wi-Fi transfer, and
a file-based-encryption downgrade.

**I checked all four against the blueprint. None of them are in it.** The blueprint says
SQLCipher + Keystore, has no home-Wi-Fi channel, and its only mentions of "30 days" and "permanent
death" are the provisional decision saying *not* those things.

They are in **Part 3 of the packet I assembled**, which I built from GLM's *Round-4* reply rather
than from the current blueprint. So both reviewers spent effort on contradictions **I introduced
at assembly time**, between my own Part 2 and my own Part 3.

**The finding survives in a different and still-real form:** the Round-4 source replies remain the
detailed spec of record, they *do* contain superseded rules, and the handoff points builders at
them. The fix is a supersession statement making the blueprint singular and build-authoritative —
not an edit to the source replies, which are evidence.

## 3. Where the two models disagree

- **How much dies when the model path dies.** Kimi (R4 and again here) argues rules-only cannot
  resolve *"the little boy who had a rough drop-off"*, so killing the model kills the product.
  GLM dissents directly: rules-only still extracts types, explicit name matches, dates and
  supplies — **what dies is pronoun/ellipsis attribution only**, so the graduated ladder is right
  but was argued against a stronger claim than the truth.
- **Both then converge on the same test**, which nobody has proposed in five rounds: run her real
  dumps through rules-only during the habit week and measure it. If rules-only is already good
  enough, two rounds of governance solved a non-problem.

## 4. Their verdict on the next slice — near-identical

1. **Spec consolidation + event-emission contract freeze.** Half a day, no code. Apply the three
   decisions, freeze `RECORD_EVENT` emission semantics, add the missing fields/tables. **Both rank
   this first or second, and for the same reason:** it is cheap, certain-to-be-needed, and the only
   item on the list that is *unrecoverable if skipped* — event history written under wrong
   semantics cannot be reconstructed, and S1 is about to pour concrete.
2. **Move the security floor into S1** — SQLCipher/Keystore, `FLAG_SECURE`, cold-start app-lock,
   `dataExtractionRules`, clipboard hygiene, restore-safety. It must exist before *real data*, not
   before S12; retrofitting encryption creates a plaintext window by construction.
3. **The employer conversation + a rules-only spike, in parallel.** Neither blocks items 1–2,
   which are entirely data-free.

**On the three open questions:** employer policy gates *real-capture* S1 and the purge job — not
the contract freeze or the security work. Rest window gates the FamilyNotes UI freeze. Parent-app
inventory gates handoff formatting. **Nothing in the top three is blocked.**

## 5. Their dissents worth keeping

- **"Reversible" was false labelling on two of my three decisions** (GLM). Retention deletions and
  mis-emitted event history are the *most* irreversible artefacts in the project; my decision log
  treated them as UI-level choices.
- **The review pass is the least-validated assumption in the system** (Kimi). Every safety
  mechanism assumes she reviews before copying, ×10–14 children, against a deadline, daily. If she
  bulk-accepts under pressure, the measurement apparatus counts a world that does not exist and the
  honest design is: model attributions never pre-fill, from day one.
- **The storage arithmetic is ~10× optimistic** (GLM). The conclusion survives; the "0.2% of one
  file" phrasing does not, and it is quotable.
- **"Year + one term" assumes disputes surface within ~7 months of year-end** (GLM). Toddler-room
  transition-age disputes run 12–15 months out. Another full year costs ~11 MB.
- **The empty-socket principle is oversold** (GLM). It covers *app-initiated* egress only — not
  OS-mediated paths, the clipboard, forensic extraction of an unlocked device, or dev-loop
  artefacts.
- **"No transfer needed in v1" rests on an unmeasured assumption** (GLM) — that `llama.rn` +
  Qwen3-4B meets an 8-second budget on her phone. Flagged as an integration risk in Round 4, never
  measured.

## 6. Calibration

| Model | Cost | Caught my 3 pre-registered findings | Unique value |
|---|---|---|---|
| **GLM 5.3** | $0.00 | 3/3 | The emission-contract framing (the unrecoverable thing is semantics, not a column); "reversible" is false labelling; home-Wi-Fi transfer is unbuildable without the INTERNET permission; `model_ref` missing; the 10× arithmetic correction |
| **Kimi K3** | $0.2021 | 3/3, two rated *Fatal* | copy→dismiss = confirmed leak with **no strike**; concrete `HANDOFF`/`HANDOFF_ITEM` SQL; purge cascading away strike history; incident-adjacent observations expiring; the pre-copy preview screen |

Both produced full-spectrum replies with DISSENT sections. **Neither needed a lens.** My own
pre-registered pass caught 3 defects; between them they found roughly a dozen more, with corrected
designs rather than complaints. The $0.20 was worth it.
