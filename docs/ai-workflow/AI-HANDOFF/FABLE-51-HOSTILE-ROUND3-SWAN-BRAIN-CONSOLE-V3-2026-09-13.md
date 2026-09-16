# HOSTILE REVIEW — ROUND 3 — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by Fable Final-Decider

**Reviewer:** OpenRouter `anthropic/claude-fable-5.1`
**Document:** docs\ai-workflow\AI-HANDOFF\HOSTILE-PACKET-ROUND3-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Seed:** (none)
**Tokens:** 5101 in / 8843 out · **Cost:** ~$0.4932 · **Wall:** 127.5s · **finish_reason:** stop

---

# FABLE 5 — HOSTILE REVIEW + FINAL RULING
**Subject:** Round-3 packet — Swan Brain Console v3 + 20-variant Three.js fleet

## VERDICT: LOCK-WITH-CHANGES
(Round-3 answer to the packet's own question: **REVISE**.)

The architecture is right and nine of ten round-2 fixes hold. But the packet's "sound" claim rests on three tests that cannot fail, one geometry fix that is wrong for everything below the fold, and an unbounded WebGL context budget that is the most likely real cause of the crash §4.4 still calls "not established." Nothing lands until §C is done. No new rounds — this ruling is the spec.

---

## A. FIX VERDICTS (§2, A–J)

- **FIX A — INCOMPLETE.** Measured on one desktop viewport only. `railLeft 84` contradicts the packet's own "76px rail" (§2 A). `contentPaddingLeft 141.6px` is a fractional vw-derived value; at 375px it consumes ~60% of width. No mobile measurement = the rail is not proven to collapse. Show `overlap FALSE` at 375/768/1440 or it's not fixed.
- **FIX B — INTRODUCES A NEW TAUTOLOGY.** "Tokens emitted from the same table the resolver reads" means the fallback count is 0 *by construction* — the identical defect the builder confesses in §4.5. The round-2 bug was "a token change would have moved zero pixels." The only test of that bug is a **token-mutation probe**: set `--primary` to a sentinel, assert the scene's sampled pixel/material colour changes. Fallback-count is not that test. Also: tokens live at the *surface*, not `:root` — a local patch to a global gap (see §C.4).
- **FIX C — CORRECT, INCOMPLETE for house rules.** Links are real, but nothing shows Dual-Button Glow, 44px targets, or `prefers-reduced-motion` on the chapter scroll.
- **FIX D — CORRECT.** Pure policy, tested loss→restore→loss. Lock.
- **FIX E — INTRODUCES A NEW DEFECT.** `if (top >= 0) return 0` means any section below the fold sits at p=0 for its *entire readable life* and animates only while leaving (top<0 → bottom<0). "Short card: 0 on entry, 1 as it exits" is exactly the bug stated as a feature — a card in the middle of the viewport never moves. Correct for the 100vh hero; wrong for the other 19 chapter bands. Use `p = clamp((vh − top) / (vh + height))` for non-hero sections and keep the hero formula. Note the pattern: round 2 pinned a bug with a formula test; round 3 pinned a different bug with a formula test. Test the **intent** (p spans [0,1] over the element's visible lifetime), not the formula.
- **FIX F — CORRECT, but it names the unresolved risk.** Releasing the probe and calling `forceContextLoss()` fixes the leak; it does nothing about 20 variants co-mounted in one gallery against a ~16-context browser cap. See §E.
- **FIX G — CORRECT.** Mounted-but-hidden canvas is the only recoverable design. Lock.
- **FIX H — CORRECT.** Triangles+lines+points is the right primitive set.
- **FIX I — INCOMPLETE.** Asserts palette/geometry/context but not one house rule: no contrast, no touch-target, no reduced-motion, no viewport matrix.
- **FIX J — CORRECT.** `shell-lens` still faintly implies optics; acceptable.

---

## B. DECISION RULINGS (every open item)

| # | Decision | Ruling | Reason |
|---|---|---|---|
| §4.1 | `durableWrites` from README substring | **OVERRIDE** | "No probe exists" is a rationalisation: the console already statically reads README and file counts, so it can statically read the adapter. Ship the three-state enum now: `DECLARED_BLOCKED` (anchored regex, negation-guarded) / `VERIFIED_BLOCKED` (adapter static scan: no write export + `fs.access(store, W_OK)` fails or store absent + no POST/PUT handler registered) / `UNKNOWN`. The bare word `BLOCKED` is banned from the console vocabulary. |
| §4.2 | CI wiring deferred | **OVERRIDE** | "Highest leverage, not done" is self-refuting. One `npm run verify` chaining all three scripts + a CI job, before any other work. Runs under software GL — which is also the §4.4 control. |
| §4.3 | No `Host`/`Origin` validation | **OVERRIDE** | One-line allowlist (`127.0.0.1`, `localhost`, optional port), reject with 421; add `Cache-Control: no-store`; emit no CORS headers. Disclosed three rounds without fixing is a process defect, not a security judgment call. |
| §4.4 | "Cause not established" | **OVERRIDE the framing; CONFIRM the materials.** | Unlit `MeshBasicMaterial` is a legitimate design choice and stays. It may **not** be cited anywhere as a crash fix. The experiment is cheap and mandatory: 20 trivial scenes co-mounted under software GL in CI, asserting `contextLost` and live-context count. |
| §4.5 | Fingerprint tuple test | **OVERRIDE — delete it.** | A test that cannot fail is noise that reads as evidence. Replace with a pairwise DOM-skeleton hash distance (nav/grid/interaction elements) and a pairwise screenshot perceptual-hash distance with a minimum threshold. Copy must say "8 scene families" wherever it says "20 variants." |
| FIX A | `&&` rules inside `WorldRoot` | **CONFIRM** | Correct scoping; ordering constraint (TDZ) must be a code comment, not tribal knowledge. |
| FIX B | Tokens emitted at surface | **OVERRIDE** | Palette tokens are declared once in the global theme (`:root`, dark-first). The surface may scope-override, never originate. Otherwise integration produces two sources of truth. |
| FIX F | Probe cached once per document | **CONFIRM** | Correct. |
| FIX G | Canvas stays mounted on loss | **CONFIRM** | Only recoverable design. |
| FIX J | Renames | **CONFIRM** | Honest. |
| §3 | Refutations 1–5 | **CONFIRM all five** | Accept as stated; §3.5's admitted inflection gap becomes work item §C.7. |

---

## C. CHANGE BEFORE BUILD (blocking)

1. **§4.2** `npm run verify` + CI job; gallery-verify runs headless under software GL with a viewport matrix (375 / 768 / 1440).
2. **§4.3** `Host` allowlist + `no-store` + no CORS. Same commit as (1).
3. **§4.1** Three-state `durableWrites`; adapter static probe; word `BLOCKED` banned unqualified.
4. **FIX B** Move token declarations to global `:root` theme; every scene colour stays `var(--token,#fallback)` (house rule — fallback present in CSS *and* token resolves). Add **token-mutation probe** to gallery-verify: mutate one token, assert sampled scene colour changes on 20/20.
5. **FIX E** Hero keeps current formula; all non-hero bands use visible-lifetime progress. Replace formula tests with three intent tests: p=0 before entry, p∈(0,1) while any part is visible, p=1 after exit.
6. **Context budget (FIX F / §4.4)** Hard cap of **4 live renderers** per document via `IntersectionObserver`; off-screen variants dispose (`forceContextLoss`) and show their poster. Verifier asserts live-context count ≤ 4 with all 20 co-mounted. This is the §4.4 control experiment.
7. **Copy gate** Extend `findSlop` (§3.5) with house vocabulary: reject `yoga|meditation|NASM-certified`, require credential string `26+ years / NASM-protocol`; stem inflections (`empower*`); catch unhyphenated `world class`. Run against all 20 variants' copy and the console's README quotes.
8. **House-rule assertions in `gallery-verify` (FIX I):** every text block over canvas sits on a scrim with ≥4.5:1 measured against the scrim, not the canvas; every nav/CTA hit area ≥44×44; `prefers-reduced-motion` freezes the loop at p=0 and disables chapter scroll animation; poster and scrim are dark-first; CTAs use Dual-Button Glow.
9. **§4.5** Delete the tuple test; add DOM-skeleton and perceptual-hash pairwise distance tests.
10. **Console UI** If `/console` renders anything chart-like, it is either plain tables/text or it moves into the React app on Victory. Raw SVG/canvas charts in the `node:http` console violate Victory-only. `[UNSURE]` — see §F.

---

## D. FINAL LOCKED SEQUENCE

1. **CI + verify script + Host allowlist** (§C.1, §C.2) — nothing else is evidence until this exists.
2. **Context budget + co-mount control** (§C.6) — the crash question closes here or reproduces here.
3. **Global tokens + mutation probe** (§C.4) — palette must be real before layout/copy work is measured.
4. **FIX E scroll progress rewrite** (§C.5).
5. **House-rule assertions + copy-gate vocabulary** (§C.7, §C.8) — run on all 20.
6. **Console honesty**: `durableWrites` three-state + adapter probe (§C.3); charts ruling (§C.10).
7. **Fingerprint test replacement** (§C.9).
8. **Re-run full matrix; publish numbers with viewport and GL mode stated.**

Rationale for reordering: the packet's current order (honesty items last, CI never) optimises for green numbers on one afternoon. This order makes every subsequent number reproducible and puts the only plausible crash mechanism first.

---

## E. SINGLE HIGHEST RISK — and the de-risk

**Risk:** Unbounded concurrent WebGL contexts. §2 FIX F establishes the mechanism (browser cap ~16, LRU eviction fires `webglcontextlost`, `parseUniform` dereferences null). §4.4 admits the crash "occurred" in a co-mounted run. A 20-variant gallery **is** a co-mounted run. The builder fixed the *leak* and then declared the *cause* unknown while the design still asks for 20 (+1 probe) live contexts — above the cap by construction. This is not a software-renderer mystery; it is arithmetic. Left as-is, a worker-bot builds a gallery page that is guaranteed to lose contexts on every browser, blames the GPU, and reaches for more "material simplification" — the evidence-removal path §4.4 already warns about.

**De-risk before build:** §C.6 — `IntersectionObserver`-gated renderer pool, hard cap 4, dispose with `forceContextLoss()` on exit, poster on evicted variants. Verifier co-mounts all 20 under software GL and asserts `liveContexts ≤ 4 && contextLost == 0 on visible variants`. If the crash persists under a 4-context cap, *then* the cause is genuinely unestablished and materials are back on the table. Until then, materials are a design choice and nothing more.

---

## F. [UNSURE] — repo facts I would need to check

- Whether the console UI renders any chart (Victory-only rule, §C.10).
- Whether `WorldRoot` remains ≤300 lines after the `&&` rules moved inside it.
- Whether any of the "20 distinct interaction models" is hover-only or drag-only with no keyboard/touch path (44px + a11y).
- Whether the 600-char README quote or `/api/state` can ever include user-facing IDs or PII if Design Brain forwards console state to an LLM (must be IDs only).
- Whether `gallery-verify 24/24` mounts variants sequentially or co-mounted (determines whether §E has already been silently tested — or silently avoided).

**Locked.** — Fable 5
