---
decision: "Brand kits ship. Six seats unanimously found the taste path leaking Swan taste to non-Swan brands; a sibling sweep found something worse — the compiler applied Swan's laws to every brand, so a non-Swan site could not render a fox."
status: shipped
supersedes: none
---

# Panel synthesis — brand kits · 2026-08-26 (loop iteration 4)

**Seats:** Ox Alpha, GLM-5.3, Kimi K3, Grok 4.6, Qwen 3.8, HY3 — **6/6 returned first try** (no 429 this round).
**Spend: estimate $0.1401; Grok measured $0.0540. The per-seat lines for Kimi and HY3 were lost when the background task's output buffer rotated, so this round's TOTAL IS UNVERIFIED.** Prior rounds ran ~1.6× estimate, which would put it near $0.22 — but that is an extrapolation, not a measurement. *Finding on myself: panel cost belongs in a file the run writes, not in a task buffer I read afterwards.*
**Verdicts:** unanimous REVISE. **Final Decider:** Fable 5.

## The finding all six seats made, and the worse one underneath it

**Every seat independently flagged the taste path** — my own open question 1, which I had asked rather than answered. `applyBrandKit` ran only on the brief path, so a render for another site was still dressed in Sean's Swan-rated corpus with no marker and no refusal. Qwen and HY3 called it a brand-scope leak and rated it P0.

They were right, and while chasing Qwen's related P0 — *"if `swanPromptCompiler` contains hardcoded SwanStudios logic, every non-Swan render is compromised"* — a sibling sweep found something the packet had not imagined:

**The compiler applied every SwanStudios law to every brand.** `assertLawful(slots, facets)` takes no profile. The `universal` law profile existed, was resolved correctly, and reached the taste path *and nowhere else*. I found it by compiling a real brief:

```
"a lone red fox crossing a snowfield at dusk"
  swanstudios -> E_LAW_VIOLATION [LAW4-optics-not-creatures]
  universal   -> E_LAW_VIOLATION [LAW4-optics-not-creatures]   <-- the bug
```

LAW4 forbids literal creature form to protect the Swan mark. **A studio built to serve other websites could not draw a fox for any of them.** The central promise of the slice was not delivered on the path that matters most. Qwen reasoned to this from the packet alone, without the code.

After the fix, the same probe:

```
  swanstudios -> REFUSED  [LAW4]         (correct — the mark is protected)
  universal   -> COMPILED, swan tokens: NONE
```

That is now the slice's headline test.

## Fixed this iteration

| Finding | Seats | What landed |
|---|---|---|
| **The compiler judged every brand by Swan's laws** | Qwen (P0), found concretely by sibling sweep | `lawProfileDrop` threaded into `compileImage`. An empty drop-list takes the ORIGINAL branch exactly, so all 29 of the compiler's own tests are untouched and still pass |
| **The Swan kill-list rode along too** — the compiler's hardcoded negative slot, whose own comment says those bans "are most of what separates Swan output" | Qwen (P0) | A kit may replace the slot. `universal` keeps only what is an artifact on any brand: watermark, text artifacts |
| **Taste ships Swan taste to non-Swan brands** | **all six** | `E_TASTE_IS_SWAN_ONLY`. The corpus is Swan-rated; there is no version of it that belongs to another brand, so it refuses and names the two things that do work |
| **Omitting `brandKit` silently defaults — "§1's bug is now the default behavior"** | GLM, Grok, Ox | Naming a `workspaceId` with no kit is now `E_BRAND_KIT_REQUIRED`. Omitting BOTH is still fine: the single-site case has no ambiguity to resolve |
| **The kit was not persisted on the asset** | Ox | `brandkit:<id>` on the row, plus the override when there is one |
| **A kit LABEL without a VERSION points at whatever that name means today** | GLM | A 12-char content hash of the kit rides with the label. Kits are mutable code objects; the hash is how "why does this not match its label" gets an answer |
| Green number excluded a third of the repo | GLM | **Fixed by measuring:** 18 files use `node:test`; `node --test` runs them — **188/188 pass**. They were never uncollectable, only run by the other runner |

## Disproven, with evidence

| Claim | Seat | Why it does not hold |
|---|---|---|
| Kit anchors get silently truncated past the prompt budget, rendering unbranded | GLM (P2) | Probed at 4000/600/300 chars: brand language survives at every budget, and `droppedSegments` is *reported*, not silent. Kit words land in a prioritised slot |
| Apply-vs-law-gate order can void LAW2 — kit palette words might bypass the law check | Grok (P1) | The opposite is true, and it cost me a test to learn: my first kit listed "gilded fern gold" and **LAW2 refused every brief**. Kit words go through the law check. That is why there is no gold in the kit |

## Deferred, with the trigger named

- **Motion gets no kit** (GLM, Grok). Motion binds an existing asset image-first, so the kit already shaped what it animates. The trigger is the moment Motion accepts a text prompt not derived from the bound asset — then it needs its own kit resolution.
- **`universal` is a one-click brand-law escape hatch in the Swan UI** (Grok P1). Real. Both refusals and the override are now recorded on the asset, which makes it auditable rather than invisible; making it *authorised* is an authz slice, not this one.
- **Kits are global, not per-tenant** (Ox P2). Same slice as the above.

## Mistakes I made this round

- **I asked the panel a question I could have answered myself.** Open question 1 *was* the defect. Six seats spent findings confirming something I had already suspected and could have probed in five minutes — the probe that settled it took exactly that long.
- **I reordered a gate wrongly.** The taste refusal fired before `resolveLawProfile`, so an invalid profile reported the wrong error. Caught by an existing test.
- **The apostrophe-in-single-quotes bug returned.** I recorded it as HELD for generated test titles; it recurred in generated *source*. The fix was scoped to where I first hit it, not to the class.

## Proof

Backend **374/374 across 19 vitest suites** and **188/188 across 18 `node:test` files**; frontend **108/108 across 13**; `tsc` exit 0; `vite build` exit 0; every file ≤300; secret scan CLEAN. **Empirical probes:** the fox compiles under `universal` with zero Swan tokens and still refuses under `swanstudios`; truncation holds at three budgets. **Falsified:** neutering the refusal into a silent fallback turns exactly the two refusal tests red.

**Not proven:** any real render. The kit's effect on an actual image remains unmeasured — that gap is unchanged and still named.
