---
decision: "Six seats independently found the same P0 — commit-before-spend narrowed the race, it did not close it. Replaced with an atomic tryCommit; eight findings fixed, two cap violations resolved, durability deferred with a corrected trigger."
status: shipped
supersedes: none
---

# Panel synthesis — the spend ledger · 2026-08-25 (loop iteration 3)

**Seats:** GLM-5.3, Grok 4.6, Kimi K3, Qwen 3.8, HY3, Ox Alpha. Ox 429'd on the first attempt (upstream shared-pool limit) and returned on retry.
**Spend $0.228** — Kimi $0.1614, Grok $0.0632, HY3 $0.0036; GLM subscription; Qwen and Ox free. **Estimate was $0.142 — actual ran 1.6× over**, the same reasoning-token gap recorded yesterday. The multiplier is now a standing part of the disclosure.
**Verdicts:** unanimous REVISE/REJECT. **Final Decider:** Fable 5.

## The finding that mattered, and it was mine to own

**All six seats independently said the same thing: committing the cost before generating NARROWED the TOCTOU window, it did not close it.** They were right, and my packet claimed otherwise.

The gate read `usage` — a snapshot the route takes once per request — then `chooseLane` ran with its `await`s, and only then did `record()` append. Fifty requests in one tick each read a total of zero, each passed a cap none of them would pass together. That is precisely the "fifty separate ones" the original stub docblock admitted it could not stop; I had moved the append earlier and declared the problem solved.

**The fix is an atomic `tryCommit`.** `usageFor` and `record` are both synchronous, so a read-check-write with no `await` between them cannot be interleaved by another request in the same process. Node's single thread is the guarantee here, not a hand-wave — and it holds exactly as far as one process, which is now written down as a deployment invariant rather than assumed.

**Grok found a genuine logic error inside my own rationale.** I wrote that a failed write must never throw because "the request already spent." That is true where the record happens *after* generation — the video lane — and **false** for the image lane, which commits *before* the provider is called. At that moment nothing has been spent, so proceeding on an unwritable ledger is unbounded spend with no counter. A billed request now refuses (`E_LEDGER_UNWRITABLE`); a free one still proceeds.

## Fixed this iteration

| Finding | Seats | What landed |
|---|---|---|
| **Check and commit were two operations; the race survived** | all six | `tryCommit` — one synchronous read-check-write. Pinned by a **concurrent** test: two batches that each pass alone, exactly one refused |
| **A failed write still let the billed lane spend** | Grok | Refuses `E_LEDGER_UNWRITABLE` before the provider call. Test asserts the generator was never invoked |
| **Degrading on the FIRST failed write is a self-inflicted outage** — one antivirus lock refuses every paid render for the process lifetime | GLM, HY3, Qwen | Three *consecutive* failures degrade; a success resets the run. The caller is still refused on every individual failure |
| **`ledger = null` makes a money control opt-in** — the next caller inherits an uncapped lane silently, which is how this happened the first time | Ox, Kimi | `E_LEDGER_REQUIRED`, permanent, when a **billed** provider runs without one. Free providers unaffected |
| **The 30-day trim rewrites the whole file** — a crash partway leaves truncated JSON, which this same module reads as corrupt and uses to refuse every billed request | GLM | Write to temp + `rename` (atomic within a filesystem). Falls back to a direct write for injected test doubles |
| **`render-agent.mjs` 344 lines against a 300 cap, and my wiring made it worse** | GLM, Grok, HY3, Ox | Mediasync moved to `handlers/mediaSync.mjs` where the convention already pointed. **338 → 270** |
| Float money: three $0.0039 renders accumulated to `0.011699999999999999` | mine, from a real-disk probe | Rounded to 1e-6 on every write |
| Deployment invariants were assumed | GLM, Kimi, Ox | Both now asserted in the header: **one process per lane** (else the cap is N×cap) and **a durable path** |

`generateVideo.mjs` hit the cap while gaining the fail-closed check, so its spend gate moved to `handlers/videoSpendGate.mjs` — **300 → 290**. Both pre-existing cap violations in this subsystem are now resolved.

## Deferred, with the trigger corrected

GLM was right that I put the durability trigger in the wrong place. I had written "when hosted generation serves more than one operator." But the ledger lives under the repo working tree, so **any deploy that cleans the tree, any container rebuild, any worktree swap deletes the counter and silently re-mints the budget** — a missing file reads as a fresh day, with no signal. Losing a batch record loses history; losing this file resets a *control*.

**The trigger is now the first deploy onto an ephemeral path**, and `SWAN_SPEND_LEDGER_DIR` is documented as the way to point it at a volume that survives. Cross-process atomicity (a lock file, or a row with a conditional `UPDATE`) rides along with that same slice.

Also deferred: typed reversal entries (GLM's argument that strict monotonicity turns a provider outage into a day-long lockout is a good one, but it needs design, and the alternative — alerting as the cap approaches — is the cheaper first move); per-workspace budgets; reconciliation against the provider's real invoice.

## Calibration

| Seat | Cost | Findings | Real | Note |
|---|---|---|---|---|
| GLM-5.3 | $0 (sub) | 5 | 5 | Deepest round: the TOCTOU sub-case across the UTC boundary, the trim-rewrite corruption path, and the corrected durability trigger |
| Grok 4.6 | $0.0632 | 5 | 5 | Found the logic error inside my own rationale — the highest-value single finding |
| Ox Alpha | $0 | 4 | 4 | Fail-open default; independently confirmed the race after a 429 retry |
| Kimi K3 | $0.1614 | 3 | 3 | Fail-closed framing ("a grep for one symbol proves nothing about call paths") |
| Qwen 3.8 | $0 | 3 | 3 | Free, and correct on all three |
| HY3 | $0.0036 | 3 | 3 | Honest confidence section: listed exactly what it could not verify from the document |

Unlike the previous round, **every seat's findings were real** — zero stale-packet artifacts, because every restated-code claim in the packet was generated by command at write time. The procedural fix from yesterday's learning packet worked on its first outing.

## Proof

Backend **351/351 across 18 suites**; frontend **107/107 across 13**; scoped `tsc` exit 0, 0 errors; `vite build` exit 0 with the Atelier chunk beside a known-good control; every production and test file **≤300 lines**; secret scan CLEAN; import-execution smoke on all new modules plus the agent's re-exports.

**Falsification, twice:** reverting `commit` to the old record-then-allow semantics turns exactly the two new P0 tests red and nothing else. **Real-disk probe:** separate files per lane, cross-lane isolation, rounding clean, no `.tmp` residue, and `tryCommit` refusing the second commit on an accumulated total.

**Not proven:** multi-process behaviour (asserted as an invariant, not tested), a real disk-full condition, a real provider charge.
