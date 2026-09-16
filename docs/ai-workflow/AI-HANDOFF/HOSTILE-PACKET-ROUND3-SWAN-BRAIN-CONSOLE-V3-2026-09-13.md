# HOSTILE REVIEW — ROUND 3 — Swan Brain Console v3 + 20-variant Three.js fleet

**Finish line review.** Round 1 (2 seats) found 17 findings; round 2 (3 seats) found 10 more, all real,
all fixed. This round asks one question: **is the current state sound, or is something still wrong?**

---

## 0. Your job

1. **New findings only.** Round 1 and round 2 defects are listed in §3 with their fixes. Do not re-raise
   them. If you believe a fix is WRONG, say so in §2's fix verdicts — that is different from re-raising.
2. **Attack §4 hard.** Those are four things the builder deliberately did NOT fix. That is where the
   remaining risk is, and the builder has a motive to rationalise them.
3. Label every finding `DEFECT` / `UNSUPPORTED CLAIM` / `MISSING WORK`. Mark checkable-but-unshown facts
   `[UNSURE]`. You have no repo access; this packet is all you have. In round 1, seats asserted five such
   facts and were wrong on all five — silence costs less than invention.
4. **Rank by blast radius.** Three finished findings beat twenty plausible ones.
5. **Finish.** Both GLM seats returned EMPTY BODIES at an 8,000-token cap in rounds 1 and 2 by spending it
   all on reasoning. The cap here is 32,000. If you run long, emit fewer findings written fully.
6. End with exactly one verdict: `APPROVE` / `REVISE` / `REJECT`.

---

## 1. What this is

Twenty structurally-distinct Three.js front-page variants for a React 18 + TypeScript + styled-components
app, plus a zero-dependency `node:http` operator console that reports the Design Brain learning engine's
real state. Nothing is committed or deployed. No route imports the fleet; the canonical homepage is
untouched.

**The single most important design fact, stated honestly:** the 20 variants resolve to **8 Three.js scene
families** (`terrain`×2, `lines`×3, `rings`×2, `orbit`×3, `points`×2, `instanced`×3, `waveform`×2,
`refract`×3). What is genuinely 20-fold distinct is the **layout**: 20 unique grids, 18 distinct nav
models, 20 distinct interaction models. The divergence fingerprint is `nav_model|hero_mechanics|grid` —
three enum strings the builder authored, so its uniqueness is guaranteed by construction and proves
nothing about how the pages look.

---

## 2. The ten round-2 fixes — judge each

```
FIX A  rail reserve was dead code, TWICE
       1st cause: --rail-left/--rail-right declared on `Nav`, a SIBLING of `Content`. Custom
                  properties inherit downward only, so Content always resolved the 0px fallback
                  and a 76px rail sat on the headline (measured: navRight 101, headlineLeft 17).
       2nd cause: the corrected rules were interpolated into a styled(WorldRoot) descendant,
                  compiling to `.Surface section[data-nav-model=...]` — which cannot match the
                  surface element. The reserve silently stayed 0px again.
       NOW:      rules live INSIDE WorldRoot with `&&` specificity, before WorldRoot's declaration
                 (a later const would be in its temporal dead zone and throw at import).
       MEASURED: railLeft 84px · contentPaddingLeft 141.6px · headlineLeft 101 · overlap FALSE

FIX B  the design palette never reached ANY scene
       Nothing in the app declared --primary / --ice-wing / etc. All 10 tokens resolved empty on
       every variant, so every scene rendered the hardcoded fallback hex while the code claimed to
       be palette-driven. A token change would have moved zero pixels.
       NOW: token declarations emitted at the surface, generated from the same table the resolver
            reads.
       MEASURED: 0 colour fallbacks on 20/20 (this assertion was Fable 5.1's round-2 ruling; it
            failed 20/20 when first added)

FIX C  every interactive control was inert
       `(label) => { if (preview) return; void label; }` does nothing in EITHER branch.
       NOW: nav items scroll to their chapter band; CTAs are real router links with a linkPrefix.

FIX D  contextLost lied during the fatal second loss
       `restored` was set on restore and never cleared, so loss -> restore -> loss published
       contextLost:'no' on a permanently dead canvas.
       NOW: pure createContextLossPolicy() tracking "restored since the MOST RECENT loss";
            onLost stops the loop and shows the poster immediately; onRestored is ignored once the
            policy has given up. 6 tests cover loss -> restore -> loss and late-restore flap.

FIX E  the hero camera started mid-dolly and finished almost immediately
       `p = vh*0.85 - top` gave p = 0.85 at scroll 0 on a 100vh hero, and the whole move completed
       after 15% of a viewport of scroll. The builder's own test had PINNED the bug by asserting
       p(0.85vh) == 0 and never testing p(0).
       NOW: `if (top >= 0) return 0; p = -top / max(1, height)`
       MEASURED: 100vh hero -> 0 at load, 0.5 half a screen in, 1 after one full screen
                 200vh hero -> 0 at load, 1 after two screens
                 short card -> 0 on entry, 1 as it exits

FIX F  WebGL context leak, and a better suspect for a crash misattributed in round 1
       hasWebGL() created a probe context per mount and never released it; renderer.dispose() never
       called forceContextLoss(). Browsers cap live contexts (~16) and LRU-evict the oldest, firing
       webglcontextlost — after which getActiveUniform returns null and Three's parseUniform
       dereferences it. That is EXACTLY the signature round 1 blamed on the software renderer.
       NOW: the probe releases its context and is cached once per document; cleanup calls
            renderer.forceContextLoss(). The round-1 attribution is WITHDRAWN.

FIX G  the poster never appeared on the first loss
       `lost` was not an input to `motion`, and setLive(false) was gated on losses > 1, so after a
       loss the user saw a frozen canvas while data-live claimed health, and the "lost twice" note
       was unreachable.
       NOW: poster shows on the FIRST loss; canvas stays MOUNTED but opacity-hidden, because
            unmounting destroys the context and a destroyed context can never fire
            webglcontextrestored, which would make recovery impossible.

FIX H  drawCalls > 0 alone passes an empty draw, and a stopped canvas keeps its last count
       NOW: the verifier requires primitives WHILE the loop runs. `primitives` counts triangles +
            lines + points — requiring triangles alone falsely failed 6 variants that draw lines
            and points.

FIX I  the verifier was blind to palette, geometry and context state
       NOW: it asserts colour-fallback count, context-lost, primitive count and palette.

FIX J  honest naming
       `liquid-surface` / `shader-morph` / `lens-refract` promised transmission physics that unlit
       MeshBasicMaterial shells cannot perform. Renamed `layered-shells` / `shell-morph` /
       `shell-lens`.
```

**Current evidence, all re-run after the fixes:**
`tsc --noEmit` 0 errors · fleet contract 13/13 · runtime contract 37/37 · engine contract 10/10 ·
`gallery-verify` 24/24 (every variant animating, non-zero primitives, 0 colour fallbacks) ·
`console-verify` 17/17 · rule 4 max 300 lines.

---

## 3. Round 1 + 2 findings verified WRONG (do not re-raise; you may attack the refutation)

1. "Builders read `ctx.size` at build time while it is still `{1,1}`." — **Zero** references to `ctx.size`.
2. "`SCENE_SIGNATURES` contradicts the implementation." — It declares `MeshBasicMaterial` for the refract
   family, exactly what is constructed.
3. "The generator could revert the five fixes." — Generated variant files are ~1.1KB wrappers; no fix
   lives in them.
4. "`findSlop` is never invoked." — The fleet contract suite calls it.
5. "Evasion examples `game changing` / `dive deep into` pass the copy gate." — Both are caught. The
   *mechanism* is real (inflections like `empowers`, and unhyphenated `world class`, do pass).

---

## 4. ATTACK THESE — the four things deliberately NOT fixed

### 4.1 `durableWrites` derives from README prose, not a behavioural probe

```js
const GATE_DECLARATION = 'remain fail-closed';
const gateDeclared = Boolean(readme && readme.includes(GATE_DECLARATION));
const durableWrites = gateDeclared ? 'BLOCKED' : 'UNKNOWN';
```

The console is GET-only and cannot *test* a write gate. So it reports `BLOCKED` when the engine's own
README still declares the gate, and `UNKNOWN` (plus a demand for human re-review) when that sentence
disappears. **All three round-2 seats said this is still an unsupported claim**: an engine whose adapter
ships unlocked while the README keeps the sentence reports `BLOCKED` — confident, green, wrong. A README
that says "must no longer remain fail-closed" still matches the substring.

The builder's position: the honest upgrade is `VERIFIED_BLOCKED` (a config/adapter probe) vs
`DECLARED_BLOCKED` (prose) vs `UNKNOWN`, and no config probe exists in this repo to read. **Is "no probe
exists" true, or is it a rationalisation for not writing one? What would the probe be?**

### 4.2 No CI wiring for any verifier

Three verification scripts live in `scripts/` and nothing guarantees they ever run again. Every green
number in §2 is evidence about one afternoon. The builder ranks this the highest-leverage open item and
still did not do it in this round. **Is that defensible, or is "highest leverage" contradicted by
leaving it undone?**

### 4.3 No `Host` / `Origin` validation on the console

The server binds `127.0.0.1`, is GET/HEAD-only, and serves a fixed asset allowlist — but it validates
neither `Host` nor `Origin`, so a DNS-rebound page could read `/api/state` (repo structure, file counts,
up to 600 chars of quoted README). Writes are impossible by construction. A `Host` allowlist is a
one-line change. **The builder disclosed this in three consecutive rounds without writing the one line.
Why is that acceptable?**

### 4.4 The context-loss crash has no control experiment

Round 2 found a code-side context leak that produces the same crash signature previously blamed on the
software renderer. The attribution is withdrawn, but **no experiment has been run** to establish the real
cause: no co-mounted run under hardware GL, no control page of 20 trivial scenes under software
rendering. The builder says the honest statement is "cause not established". **Is disclosing an
unestablished cause sufficient, or does shipping unlit materials to make a crash disappear remain an
evidence-removal problem?**

### 4.5 And the standing honesty question

The builder tells the user "20 unique layouts, 18 nav models, 8 scene families" rather than "20 completely
different front pages". Is that sufficient honesty, or does any artifact still overclaim? Note the
builder's own admission that the fingerprint's uniqueness is **guaranteed by construction** and therefore
proves nothing — a test that cannot fail is not evidence, yet it is still in the suite as
`has no duplicate nav_model + hero_mechanics + grid tuple`.

---

## 5. Output format

```
## VERDICT: APPROVE | REVISE | REJECT

## FIX VERDICTS (FIX A..J)
CORRECT | INCOMPLETE | INTRODUCES A NEW DEFECT — one line each.

## NEW FINDINGS (ranked by blast radius)
### F1 — <title>   [DEFECT | UNSUPPORTED CLAIM | MISSING WORK]
Blast radius: ...
Evidence: <quote §2/§4, or state precisely what is absent>
Why it is wrong: ...

## ATTACK ON §4 (the four unfixed items + the standing honesty question)
For each: acceptable, or rationalising? Be specific. Name what you would actually do.

## [UNSURE]
Facts you would need repo access to check.
```

Three finished findings beat twenty plausible ones. An empty body is not an answer.
