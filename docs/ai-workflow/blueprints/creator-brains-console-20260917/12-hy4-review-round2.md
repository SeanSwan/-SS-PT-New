# 12 — Hostile review round 2 — Creator Brains Console

- **Date:** 2026-09-18 · **Scope:** the four surfaces round 1 structurally could not see — the packet's internal consistency web, the unreviewed S3–S7 plan, the locked CD3 concept, and round 1's own remediation.
- **Verdict: REVISE** — 2 code defects (both real, both in my own round-1 remediation), 3 receipt defects, 1 concept finding. All fixed and pinned.
- **Attribution (correcting an earlier error):** this pass was performed by the **builder seat**, not by HY4. Three paid HY4 attempts were made and **all three billed with zero output** — see §5. The round-1 document (`11-hy4-review.md`) is likewise misattributed: the transport it used hard-blocked everything except `tencent/hy3`, so its findings were almost certainly produced by **Hy3 under HY4's name**. The findings themselves stand; the attribution does not.

---

## 1. H1 — a failed probe evicts the history fallback (CODE, P1, REAL)

**Where:** `scripts/creator-brains/console/lib/health.mjs`

The cache wrote the raw probe result *before* consulting history:

```js
const fresh = probe();
cache = { atMs: now, value: fresh };        // <-- failure now cached for the whole TTL
if (!fresh.ok && r) { const history = lastCanary(r); ... }
```

So the history fallback fired on **exactly one read** — the one that happened to take the probe. Every later read inside the window hit the `cached` short-circuit and served the **failure**, labelled as a fresh live probe.

Observed, before the fix (`probe-failcache.mjs`):

| Read | `ok` | `source` | `stale` | `note` |
|---|---|---|---|---|
| 1 (probe taken, fails) | `true` | `history` | `true` | "showing the last recorded canary result instead" |
| 2 (+10 s, no probe) | **`false`** | **`probe`** | **`false`** | **`null`** |

Read 2 is the worst possible output: a **false alarm presented as a fresh authoritative verdict**, with no note saying the probe failed. The console's health badge would flip to red on its own, ten seconds after correctly showing green. That is precisely the "crying wolf" the fallback was written to prevent — and it fires on the *second* read, which is the one nobody tests.

**Fix:** cache the **resolved** answer, not the raw probe. `probeAtMs` (when we may probe again) is now separated from `checkedAtMs` (how old the value shown is), so history can be served for the whole window without triggering a re-probe storm. A history reading is now always `stale: true` — it is never a live verdict. Regression: `test/health.failcache.test.mjs` (5 tests, **T-B14**).

**Why the existing 12 fallback tests missed it:** all of them exercised the fallback on the *same* call that took the probe. The natural way to write the test is also the one blind spot that mattered.

---

## 2. H2 — the LANE B leak guard has 8 false negatives (CODE, P1, REAL)

**Where:** `scripts/creator-brains/console/test/leak-guard.mjs`

The detector's docstring claimed it "does not depend on the leaker choosing a predictable name." A hostile probe (`probe-leak.mjs`, 11 real leak shapes) proved that false: **8 of 11 escaped**, caught 3.

| Leak shape | Before |
|---|---|
| cue array, known container name | caught |
| cue array renamed to `items` | caught |
| cue array, timing key renamed to `begin` / `offset` | **ESCAPED** |
| single cue object (not an array), e.g. `{cue:{tStartMs,text}}` | **ESCAPED** |
| 50 KB transcript under `notes` / `detail` / `snippet` | **ESCAPED** |
| bulk text nested under benign keys | **ESCAPED** |
| multi-sentence prose under `throttle.text` | caught |

The decisive hole: the prose check only fired for four names (`text|body|content|caption`), so **any long transcript under any other key name walked straight through**. This guard is the enforcement for the repo's hardest invariant — LANE B raw transcripts must never be served — so a name-dependent guard is not a partial control, it is theatre.

**Fix:** (1) a **size gate** — any single string > 2 000 chars is a leak under *any* key name, per-string rather than aggregated so `backlog.lines` (many short lines) is unaffected; (2) cue detection broadened to renamed timing keys and to single objects. Result: **11/11 caught**.

**The false positive this almost shipped.** Broadening the timing keys alone immediately condemned `throttle`, which carries `{ ..., start, text }` — but `throttle.start` is an **ISO timestamp string**, while a caption cue's timing is a **numeric** ms offset. Requiring `typeof v === 'number'` separates them on the thing that actually differs. Found because the full suite went 70→69 the moment I ran it; pinned in `test/leak-guard.falsenegative.test.mjs` (**T-B15**), which asserts both directions.

---

## 3. F1–F3 — the readiness receipt contradicts itself (RECEIPT, REAL)

`readiness.json` had drifted from the code it describes:

| # | Defect | Evidence |
|---|---|---|
| F2 | All **26** tests `NOT RUN` with reason "plan phase — no implementation exists yet", while S0 is built and green | the receipt denied the implementation |
| F3 | `T-B13` declared in `06-test-plan.md` but **absent** from the receipt; `R13` did not list it | a test with no receipt row |

Fixed: the 9 S0-realised bridge tests set to `PASS` (B4/B5/B10 stay `NOT RUN` — they are S3/S4; B12 is S7; all W/T/E remain correctly `NOT RUN`); `T-B13` and the two round-2 regressions added with back-references. Final: **11 PASS / 18 NOT RUN**, gate `structurallyReady: true`.

**F1 — retracted, my own error.** I first reported `phase: "plan"` as contradicting `nextSlice: "S0 — bridge COMPLETE"` and changed it to `"build"`. That was wrong on two counts: (a) `nextSlice` is a statement about what is *next*, not a phase claim, so there was never a contradiction; and (b) `check-readiness.mjs:25` accepts only `plan` or `implementation`, and `implementation` requires **every** test to be `PASS` — impossible while 18 belong to later slices. The schema simply has no phase for "partially built". `phase` is back to `"plan"`.

Two further schema details I got wrong before the gate corrected me, recorded because they will bite the next person who edits this receipt:
- `PASS` tests are validated with the **section** evidence shape `{path, sha256}` — a plain string array is rejected. (`NOT RUN` tests are not evidence-checked at all, which is why the strings had passed unnoticed.)
- `T-B15` originally declared `requirements: ["R-invariant 1"]`, which is not an id in the requirements list; LANE B maps to **R6**.

---

## 4. F4 — the engine baseline number appears four times, four different values (RECEIPT, REAL)

| Doc | Value |
|---|---|
| `README.md` | 136 / 136 |
| `evidence/baseline-offline.txt` | 136 / 136 (the offline subset) |
| `00-consult-brief.md` | 191 |
| `11-hy4-review.md` | 182 / 189 |
| `08-slices-operations.md` (original) | 185 |

These are not all wrong — 136/136 is the **offline subset** and 182/189 is the **full suite** — but they are presented interchangeably as "the engine baseline," which is exactly the drift class that makes a receipt untrustworthy. **Not fixed:** reconciling them means deciding which number is the baseline of record, which is an engine-lane decision. Flagged for Sean.

---

## 5. What is genuinely fine (checked, not assumed)

I looked for these and did not find them; saying so is part of the review.

- **CD3 reduced-motion is properly specified.** D9 (02 §5) pins "sub-perceptual drift (<5% visual energy) + **fully static under reduced-motion**; pause off-viewport/hidden." The concept does not merely skip the entry dolly — the constellation's idle motion is covered too.
- **CD3 at mobile is properly specified.** `03-wireframes.md` is explicitly CD3-drawn and at 414px the constellation **collapses to a static mini orb**, roster becomes the interface. Not an unsolved split-view-at-320px problem.
- **S3/S4 ownership is coherent after the H6 fix.** `05 §2b` names the owning slice for each deferred route and `08` restates it; `06` tags T-B4/B5/B10 to their slice. The split did not move the drift elsewhere.
- **TTK, no cache stampede.** `healthReading` is synchronous and single-threaded, so concurrent readers cannot double-probe. The failure was the caching policy, not a race.

---

## 6. C1 — CD3's "lazy-loaded" three chunk is not actually lazy (CONCEPT, REAL)

02 §6 sets: *initial bundle (excluding lazy three chunk) ≤ 500 KB gz; three chunk ≤ 900 KB gz; **loaded only on viewport enter***.

Under CD3 the constellation is the **left half of the primary split view** — it is in the viewport on load, always. So "on viewport enter" fires immediately and the 900 KB chunk loads with the page. The ≤500 KB initial budget is **technically met** and **user-facingly meaningless**: perceived initial load is ~1.4 MB.

This is not a violation, it is a **budget that stops measuring what it was written to measure** the moment CD3 became the concept. Cheapest decisive test: at S5, measure bytes on the wire before first paint against a single 1.4 MB number rather than two separate ones. If ~1.4 MB is acceptable, say so explicitly; if not, the constellation must defer below the fold.

Related, smaller: `03` wireframes 414px but T-E2's matrix starts at **320px**. The mini-orb pattern presumably holds; it is unstated.

---

## 7. Highest-risk item and the cheapest decisive test

**H1 (§1)** — it is the only finding that produces a *wrong user-visible state on a working install*, and it would have shipped silently behind 65 green tests. The cheap test is the one now in `health.failcache.test.mjs`: read twice inside the TTL and assert the story does not change. **A console whose story changes without a new measurement is lying**, and that is the invariant worth pinning.

---

## 8. Verification

```
node --test scripts/creator-brains/console/test/*.test.mjs
# tests 76 / pass 76 / fail 0
```

- New: `health.failcache.test.mjs` (5, T-B14), `leak-guard.falsenegative.test.mjs` (6, T-B15).
- Leak probe: 3/11 → **11/11** caught, with contract payloads still passing.
- All console `.mjs` files ≤ 300 lines (largest 283 — see 11 §5 for the corrected count).
- `check-readiness.mjs` → `structurallyReady: true`.
- Engine untouched: `git status --porcelain scripts/creator-brains/` → `?? scripts/creator-brains/console/` only.

## 9. Cost of this round

The three HY4 attempts billed **$0.116** and returned nothing. Root causes were found and fixed in `scripts/consult-hy3-design.mjs`: pricing was Hy3's rate (6× too low — real rate is **$0.834/M in, $2.501/M out**) and the request was non-streaming, so a reasoning model's paid output was lost while the request waited for headers. It now uses the shared `scripts/lib/openrouter-stream.mjs` helper. HY4 remains unusable for a full review at this balance because it spends 4 000+ tokens on hidden reasoning before emitting anything — it needs ≥64k `max_tokens`, ~$0.17 worst case.
