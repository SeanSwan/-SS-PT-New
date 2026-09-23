# HANDOFF — 2026-09-22, 22:50 PDT — the S5 constellation subsystem, eleven reviewed findings

**From:** workbuddy (Sable) — session seat `workbuddy / deepseek-v4.1-flash`
**To:** whoever owns the S5 / CD3 "Vault Observatory" constellation workstream
**Repo:** `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT`
**Branch:** `creator-brains-engine-r2-20260915` · HEAD at handoff `6d5e411e7`
**Review cited:** `Z:/HostileReviews/2026-09-22-140126-uncommitted-constellation-subsystem-cd3-s5-the.md`
**Work packet reviewed:** `docs/ai-workflow/blueprints/creator-brains-console-20260917/`

---

## 0. Read this first — four facts, 60 seconds

1. **I did not edit your files. Nothing in `packages/creator-brains-console/web/src/components/`
   was modified by me.** The subsystem is your uncommitted work; this note reports, it does not act.
   Two files *are* touched by me elsewhere (see §6) and neither is yours.
2. **The subsystem is green and uncommitted.** 15 web files / 145 tests pass, `tsc --noEmit` 0
   errors. Everything below survives that suite — that is the point of §2.
3. **The exit evidence document claims more than the tests prove about the frame budget.** §2 is the
   one finding worth reading even if you read nothing else.
4. **Every finding below was independently re-verified against `file:line` after the review
   returned.** Nothing here is quoted from the review's summary; where I re-measured, the
   measurement is given.

---

## 1. What was reviewed, and why it is not my code

The S5 slice table (`08-slices-operations.md:12`) records all four exit criteria as
**DISCHARGED 2026-09-22**, with `19-s5-exit-evidence.md` as the evidence. The subsystem that
discharges it is 25 files: 8 source modules, 5 test files, and 12 supporting files, of which
`BrainConstellation.tsx` is tracked-modified and the other 24 are **untracked**.

My own S5 work was deliberately narrow and is already landed:

| Commit | What |
|---|---|
| `2dbafb8d7` | `BrainConstellation.tsx` 380 → 292 lines against **ban 14 / Rule 4** (≤300). Split at the render-vs-behaviour seam; `constellation.styles.ts` (112) extracted. |
| `f6e09bca4` | the Rule 4 sweep that proves the package is now clean. |
| `e99e3723c` | the locating report, additively superseded per Astra F9. |

A full Rule 4 sweep of `packages/creator-brains-console` returns **empty**. I mention this because
Rule 4 is what put me in your directory at all — not because I claimed any part of S5.

---

## 2. D1 — the budget guard measures a substitute, not the renderer **[HIGH]**

This is the finding with the longest reach, so it goes first.

**What is true.** `src/components/constellation-budget.test.ts` passes 4/4 and prints:

```
[T-E3] 40 nodes — median 0.0047ms, steady-state median 0.0036ms (budget 16.7ms)
[T-E3] responsiveness — 4 nodes 0.0004ms vs 400 nodes 0.0080ms
```

`19-s5-exit-evidence.md` §4 presents this as **"T-E3 — the frame budget, MEASURED"**.

**What the file actually does.** It imports **exactly two things**:

```js
import { describe, expect, it } from 'vitest';
import { layoutBrains, nodeRadius, type BrainNode } from './constellation-layout';
```

It never imports `constellation-three` or `constellation-loop`. `oneFrame(...)` at `:67-89`
**re-implements** a per-node arithmetic loop — the drift sine, the position read, the transform
sum — and times *that*:

```js
function oneFrame(nodes: BrainNode[], f: number, sink: { v: number }): void {
  for (const n of nodes) {
    const drift = Math.sin((f + n.arc) * 0.004) * 0.05;
    const { x, y, z } = n.position;
    sink.v += x + y + z + drift + n.arc + n.size + nodeRadius(n.size);
  }
}
```

The doc comment is honest that jsdom has no WebGL and that GPU raster is excluded. It is **not**
honest about the larger gap: the code under test is not the shipped frame body at all. The comment
says "the CPU-side per-frame work this code owns" — but the helper's body is a *paraphrase* of
`constellation-three.ts`'s `frame()`, and a paraphrase does not regress when the original does.

**The counterexample, which is the whole argument.** Replace the production `frame` with `() => {}`
— a renderer that does nothing whatsoever — and this suite is **unchanged**. It cannot fail on any
renderer change, because it never calls the renderer. Its only real coupling to the subsystem is
`layoutBrains`/`nodeRadius` via the node fixture.

**Why this matters beyond one weak test.** The T-E3 clause
(`06-test-plan.md:81`) is a **contract clause**: *"`performance.now()` frame samples ≤ 16.7ms median
with 40 nodes"*. The exit evidence turns that clause green. A guard that cannot fail on the code it
names is not evidence for the clause; it is a claim with a passing test next to it. Three separate
scopes are being conflated in one number:

| Scope | Measured? | Where it should live |
|---|---|---|
| the pure layout maths (`layoutBrains`, `nodeRadius`) | measured | a unit test — and `constellation-layout.test.ts` already does this |
| the shipped per-frame body (`SceneHandle.frame`) | **not measured** | the budget harness |
| GPU raster time | **not measured**, and correctly declared out of scope | a real-browser perf trace, e.g. the existing Playwright render harness |

**What would count as fixed.** The harness must **import and call the real `frame()`** — the
exported `SceneHandle.frame`, exercised through a scene built with a `null`/stub renderer so the
timed window is the production body — and it must carry a **mutation it can detect**. A usable
acceptance test: inject a deliberate per-frame regression into the *production* module (e.g. an
allocation or a geometry rebuild inside `frame`) and require the median to move red. If deleting the
production body leaves the suite green, the suite is not the guard.

The existing "responds to load" case (4 nodes vs 400) is a real improvement over its predecessor and
should be kept — it proves *something* is timed. It does not prove *the right thing* is timed.

---

## 3. D3 — duplicate rAF loops survive a visibility flap **[HIGH]**

**`constellation-loop.ts:135-143`:**

```js
setVisible(next: boolean) {
  if (stopped) return;
  const was = visible;
  visible = next;
  if (!was && next) { last = now(); handle = requestFrame(tick); }
},
```

The hidden path at `:110` is correct in shape — it stops without re-arming, and the comment explains
that this is deliberate so a later `setVisible(true)` restarts it. But the hide path **never cancels
the frame already in flight**. `handle` is left pointing at a live callback.

The show path then re-arms **unconditionally**, overwriting `handle`. The in-flight callback from
the hide is still queued, so one `setVisible(false)` → `setVisible(true)` pair with no frame
delivered in between leaves **two independent `tick` chains** running. Both call
`opts.onFrame(elapsed)`; both re-arm. Each further flap adds another.

`tick`'s first line is `handle = null` (`:101`) and the guard at `:110` returns early when
`!visible`, so the duplicate chain is not *detected* on the tick where it is created — it is
created silently and only multiplied.

### D3 is MEASURED, not deduced

I ran this against the shipped module rather than reasoning about it. A temporary probe (since
deleted, never committed) used the suite's own `pump()` stub, drove one normal frame, then applied
the flap, and counted queued callbacks and delivered frames:

```
queued after flap = 2      (1 means sane, 2 means duplicate)
frames before flap = 1
frames after one step = 3
frames after two steps = 5
```

**Two live rAF callbacks after a single flap, and the frame counter advancing by 2 per batch**
(1 → 3 → 5). That is two independent chains delivering a frame each, which is the defect stated as
a measurement. The probe's assertion `expect(p.queued()).toBe(1)` failed
`expected 2 to be 1` — the guard red for exactly the right reason.

**Why the shipped suite cannot see it.** `constellation-loop.test.ts`'s return leg
(`:100-103`) costs one extra frame on the resume path before it re-arms:

```js
loop.setVisible(false);
p.step();                         // ← this step drains the in-flight callback
...
loop.setVisible(true);
p.step();
expect(loop.frames()).toBe(offscreen + 1);   // resumes on return
```

That intervening `p.step()` empties the queue, so the in-flight callback is gone before the resume
arms a new one. The suite is **structurally incapable** of producing the duplicate — the flap it
tests is always separated by a frame. The gap is not a weak assertion; it is an assertion that
cannot reach the state. The missing case is a resume whose `setVisible(true)` lands in the **same
tick** as the `setVisible(false)`, which is exactly what an `IntersectionObserver` batch or a
scroll-back during a fast flick can do.

**The cheap discriminator for the fix:** assert the number of **live queued callbacks** is exactly 1
after a false → true with no intervening frame — not the count of `tick` invocations, which is
downstream of the bug and doubles along with it.

**What would count as fixed.** One scheduling path, not two. Centralise the arm behind a
`handle === null` guard (or cancel the in-flight frame on hide, symmetric with `stop()` at `:128-131`),
so `setVisible(true)` cannot arm a second chain. Then add the false → true-without-a-frame case
above, set against a `requestFrame` spy.

---

## 4. D2 — arc geometry is baked at creation and never updated **[HIGH]**

**`constellation-three.ts:180-190`** — `makeArc` bakes two data-dependent values into the vertex
buffer **at creation time**:

```js
function makeArc(n: BrainNode): Line {
  const r = nodeRadius(n.size) * 1.6;      // ← size-dependent
  ...
  const a = (i / seg) * n.arc - Math.PI / 2;  // ← coverage-dependent
```

**`:137-143`** — the existing-node branch of `update()` handles a re-layout by updating
`position`, `geometry`, `material.color`, and `arc.visible` — but **never rebuilds arc vertices**:

```js
existing.mesh.position.set(...);
existing.mesh.geometry = sphereFor(r);
(existing.mesh.material as MeshBasicMaterial).color.set(color);
existing.node = n;
existing.arc.position.copy(existing.mesh.position);
existing.arc.visible = n.coverage !== null && n.coverage > 0;
```

So when a creator's `videos` count or fetch coverage changes between polls — the exact thing R10
encodes as *"size = video count, ring/arc = fetch coverage"* — the node sphere grows or shrinks
correctly, while its **coverage ring keeps the old radius and the old sweep angle**. The ring can
even stay visible or hidden on the previous poll's `coverage` value, because `visible` is the only
arc property that *is* refreshed. A creator that gained videos shows a ring sized for the old count;
a creator whose coverage went to zero keeps its ring geometry but hides it — the geometry, and the
data it encodes, are stale in both directions.

**Inferable from the file; not yet confirmed by an executed mutation.** I am labelling it
`inferred` rather than `proven` on purpose — see §7 for the standard.

**What would count as fixed.** Either rebuild the arc on the existing branch when `r` or `n.arc`
changed, or (better, given the T-E3 budget) give `makeArc` a geometry whose radius is **1** and
scale the line object, updating the buffer only when the sweep angle changes. Then add the mutation:
feed `update()` a second node list where one node's `videos`/coverage changed and assert the arc's
geometry attributes actually differ.

---

## 5. Two smaller ones, both worth the ten minutes

### D4 — arc resources leak on removal **[MEDIUM]**

`constellation-three.ts:157-164` disposes only the **sphere** material when a creator is removed:

```js
for (const [id, entry] of meshes) {
  if (seen.has(id)) continue;
  root.remove(entry.mesh);
  root.remove(entry.arc);
  (entry.mesh.material as MeshBasicMaterial).dispose();   // ← arc geometry + material untouched
  meshes.delete(id);
}
```

Compare `dispose()` at `:264-283`, which is thorough — it disposes the arc geometry, the arc
material, the sphere cache, the ring, the dust, and then calls `renderer.dispose()` **and**
`renderer.forceContextLoss()`. So the teardown path knows what an arc owns and the removal path
does not mention it. `makeArc` allocates a fresh `BufferGeometry` + `LineBasicMaterial` per new node
(`:188-190`), and `sphereFor` is a **shared** quantised cache — which is exactly why the sphere
material *is* disposed per-node there. The arcs are the unshared allocation and they are the ones
left behind. A long-lived dev session with a churning roster accumulates one geometry + one material
per removed creator.

### Q5 — the camera FOV has two sources of truth **[MEDIUM]**

| Location | Value |
|---|---|
| `constellation-three.ts:81` | `new PerspectiveCamera(55, 1, 1, 1000)` — literal |
| `constellation-scene-parts.ts:39` | `export const VFOV = (55 * Math.PI) / 180;` |

`distanceToFit` is solved against `VFOV` (`:58-63`), and the camera is built from a **hardcoded 55**
that merely happens to agree today. The exported constant carries a comment that says precisely why
this matters:

> *"It lives here rather than as a literal in two places because a fit computed against a FOV the
> camera does not use is silently wrong in a way that looks like a bad framing choice rather than a
> bug."*

The comment describes the correct design; `:81` violates it. The failure is silent in the worst
way: change one and the framing drifts, `distanceToFit` stays arithmetically correct for a camera
that no longer exists, and the symptom looks like an art-direction regression. Fix: derive the
camera from `VFOV`.

---

**Continued in** `HANDOFF-2026-09-22-constellation-subsystem-receipt.md` — §6 what I touched,
§7 the evidence standard for every finding above, §8 the ordered suggestion. Split from this file at
the findings/receipt seam to stay under the **Rule 4 ≤300-line** cap (ban 14), by extraction rather
than by trimming the reasoning.

---

*Filed under Rule 86 discipline: the review this note cites is archived at
`Z:/HostileReviews/2026-09-22-140126-uncommitted-constellation-subsystem-cd3-s5-the.md`. A review
that is not filed did not happen.*

