---
decision: "privacy-boundary@1.2.0 — the context channels: routeContext (C6a) is a LIVE unscanned channel constrained in shape but never in content; selectedClientName (C6b) is inactive on this route by virtue of its only production caller; previousContext (C5) is no longer a channel at all."
status: open
supersedes: "03c-release-predicate.md §7 (context channels) — extracted in round 6 when 03c reached 309 lines against the 300-line cap"
---

# 03d — The context channels (C6 split, C5 closure)

**Why this file exists.** Round 6 measured **`03c-release-predicate.md` at 309 lines against the 300-line
cap** (`06-bans.md` §1, by `wc -l`) — while `03c` §8 simultaneously asserted *"It remains under the cap."*
Both the breach and the assertion were the seat's own, and both are the **R5-08 defect class**: a
self-referential size claim that went stale and was never re-measured. `03c` §8 had already instructed the
remedy — *"the next one should move §7 to its own file rather than grow this one"* — and the round-6 fixes
were that next substantive addition. §7 is extracted here. **Nothing was deleted.**

**This split moved no id.** The file carries `privacy-boundary@1.2.0` because §7 lives inside a `@1.2.0`
contract, **not** because the split bumped it — extracting §7 from `03c` moved bytes between files and changed
nothing the gate admits. The `@1.1.0` → `@1.2.0` bump belongs to round 6's semantic changes (R6-01/R6-02/R6-03:
O admission by hash identity, interpolation reclassified, transcript separated from the admission record),
which landed in `03c` in the same round the split occurred; the two are independent and only happen to share a
round. Contrast round-5 **R5-06**, where the meaning changed and the id had *not* moved — that is the failure
the `03b` §1 change rule exists to prevent. `03b-privacy-boundary.md` §1–§5 and §8–§9 remain the authority for the gate,
its placement, failure propagation and the canary assertions; `03c-release-predicate.md` §6 remains the
authority for the release predicate, provenance scoping and admission. **§7 keeps its number** — as `03c`
did when it inherited §6–§7 from `03b` — so that the several existing `§7`/`§7.1` references stay
meaningful and only their *file* component changes.

---

## 7. The context channels and the C6 split (R3-01)

`03-contracts.md` §4.2 previously carried one row, `C6 | routeContext / selectedClientName`, lumping an
**inactive** input with a **live** one. That made the row look dead and let a live channel inherit the
verdict. They are split because they differ in **both** dimensions the review named — **field** and
**entry point**.

| Field | Entry point | Status |
|---|---|---|
| `routeContext` (**C6a**) | `req.body` → `aiCommandRoutes.mjs:121`; normalized `:167`; emitted `intentClassifier.mjs:28-51` → `:116` → `:133` | **LIVE, unscanned.** `stepPHIScan` covers `ctx.sanitizedInput` only (`commandExecutor.mjs:192`). |
| `selectedClientName` (**C6b**) | none on this route — the single production caller hardcodes `selectedClientName: null` (`aiCommandRoutes.mjs:164`) | **inactive on this route.** The classifier still *supports* a non-null value (`intentClassifier.mjs:118-120`), so this is a property of the **caller**, not of the field. |
| `previousContext` (**C5**) | **no longer a channel at all** under `03e-admission-schema.md` §6.1 — server-reconstructed, referenced by conversation id | **closed by construction**, not by a check. |

### 7.1 Verified field list — `buildRouteContextLine` emits SEVEN fields, not three

Measured by **executing the shipped function body** (round-4 probe, `probe-r4-emitted-fields.mjs`).
Round 3 could only mark this UNKNOWN:

| Emitted | Gate | Hostile value that passes |
|---|---|---|
| `source`, `intent`, `surface` | `/^[a-z0-9_-]{1,80}$/i` | **`source=123-45-6789`**; a bare single-token name (`Jordan`); `mrn_883721` |
| `scheduledSessionId` | `/^[1-9]\d*$/` | any positive integer (`883721`) |
| `scheduledSessionDate`, `workoutDate` | `/^\d{4}-\d{2}-\d{2}$/` | **`workoutDate=1990-01-01`** — a DOB-shaped value is admitted |
| `scheduledSessionCredits` | safe integer `> 0` | `4` |

**Rejected:** any token containing whitespace (`Jordan T.`), tokens over 80 chars, ids with a leading zero or
zero, non-`YYYY-MM-DD` dates, and unknown fields (not emitted at all).

**Consequence:** normalization constrains **shape**, never **content**. C6a is narrower than a free-text
channel — no whitespace, ≤80 chars, so free text cannot pass — but it is **not closed**, and the two date
fields admit a value shaped exactly like a date of birth.

**Round-6 R6-06 removed a false coverage claim from this section, and it was this seat's own, added in
round 5.** It read: *"Because the emitted line is **P**-class, it is inspected by the full detector under
§6.0 — which is what catches a DOB-shaped `workoutDate` that the shape gate admits."* **That is false.**
Reproduced against the shipped scanner:

```
clean    [Route context: source=coach; workoutDate=1990-01-01]
clean    [Route context: source=coach; scheduledSessionDate=1985-03-12]
FLAGGED  DOB: 01/02/1990            <- control: the regex requires a DOB LABEL
```

The DOB pattern (`phiScanner.mjs:33`) requires a label — `DOB|date of birth|born on|birthday` — **and** a
different date arrangement. A bare ISO date is **not** detectable as a date of birth and **cannot** be: the
same bytes are a birthday in one context and a workout date in another. **Date admission is a CONTEXT
problem, not a detection problem.** The boundary admits `YYYY-MM-DD` because the *field* is a known
workout/session date from an authorised caller — not because the value was scanned. **C6a's date fields
remain open as a content channel**; the honest disposition is *admitted by context, unverified as content*,
not *covered by the detector*.

**A second emitter exists, and it is P — not O (round-6 R6-02).** `aiChatRoutes.mjs:710` appends
`buildSelectedScheduledSessionPromptBlock(...)` to `systemPrompt`. Round 5 called this *"an **O**-class
assembly fed by route-context-derived values"* — **contradicting `03c` §6.0, where interpolation results are
P.** The correct decomposition:

- the **static block template** is **O** — hashed against the registry, not content-scanned;
- the **route-context-derived values substituted into it** are **P** — scanned, admissible only if each
  input was itself admitted;
- **the rendered block is not hashed** (R6-02: two valid inputs render differently), so no hash may be taken
  over the output.

This is why **`role` is not a sufficient provenance signal** — the `systemPrompt` string mixes O and P bytes.
It needs its own P1/P2 coverage (`03b` §8 assertion 6) **and its own segment map**.

---

## 8. Size

Per `03b` §9's rule, **no number is stated here** — a document cannot reliably assert its own length,
because the sentence stating the number is part of it. Run the check instead:

```bash
wc -l 03b-privacy-boundary.md 03c-release-predicate.md 03d-context-channels.md   # all <= 300 (06-bans.md §1)
```

**This file was created by splitting, not by growth, and it has ample headroom.** The next substantive
addition to the privacy-boundary contract should be assessed against all three files before being written
into any of them.
