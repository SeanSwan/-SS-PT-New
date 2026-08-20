---
title: A promise that never settles is not an error path
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist.
date: 2026-08-20
decision: an await on a promise the platform may leave pending forever is an availability hazard that no try/catch, no error handler and no green test suite can see; and a test double that models a cooperative platform proves only that the code works when nothing goes wrong
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: investigator, builder, sole hostile reviewer
    did: refused to hand the owner a manual check it could run itself; validated the renderer before trusting any result; isolated a whole-application hang to a single await by instrumenting two lines; wrote the failing test first; fixed it; proved the fix on the real GPU; then found a second, older defect while building the feature the owner asked for
    cost: subscription (flat)
skills_touched:
  - id: Rule 49 (no manual code inspection by Sean)
    change: reinforced
    failure: the owner was about to be asked to eyeball whether a scene switch worked, on a machine the agent was already running on — the check was automatable and the answer was a P0
  - id: tests/lanes/butterchurn/milkdropLifecycle.test.ts
    change: amended
    failure: every fake AudioContext in the file resumed willingly, so a suite of 499 tests could not see an await that hung the entire application on a real browser
---

## What happened

The owner asked me to open the app on his machine and tell him whether one
button worked, because he suspected a bug I could not see from a headless
environment. I had reported that a lane switch never completed under software
rendering and honestly flagged it as unverified on real hardware.

The right move was not to hand that check back to him. I was already running on
his machine, and the only reason my earlier result was untrustworthy was that I
had forced the browser onto a software renderer myself. Re-running with the real
GPU — and printing the renderer string so the result was believable — showed the
switch still failed. Not one scene: **all six were dead, silently, with no error
of any kind.**

## Who did what

**claude-opus-5** ran the whole investigation, and the discipline that made it
work was refusing to accept any observation from an unvalidated instrument. Four
times in the prior session I had believed a false negative produced by a broken
probe. This time every step carried its own proof: the renderer string before
the verdict, `elementFromPoint` before blaming a click, the previous commit run
through the same probe before blaming my own change.

That last check mattered. The failure looked exactly like something my redesign
could have caused. Running the pre-change commit on the same server showed the
identical failure, which meant the bug was old and my job was to find it, not to
defend myself against it.

## Skills created or changed

The lifecycle test file grew the case it was missing. Every fake AudioContext in
it resumed willingly — `resume: async () => undefined` — which is a model of a
browser that always cooperates. The new double models the real one: a context
whose `resume()` returns a promise that never settles. It failed with `"hung"`
before the fix and passes after.

## Mistakes I made

- **I proposed handing the owner a manual check I could run myself.** I closed
  the previous turn asking him to open the app and report what he saw. Rule 49
  exists precisely to forbid that, and the check took me one probe. Worse, the
  answer was a P0 — so the cost of deferring it was not just his time, it was
  another cycle of world work planned on top of a broken foundation.
- **I generalised from one crippled instrument and stopped.** "It does not
  complete under swiftshader, unverified on real hardware" was honest but
  incomplete: the machine with the real GPU was the one I was running on. An
  honest limitation is not the same as an unavoidable one, and I did not check
  whether mine was avoidable before writing it down.
- **I filed a symptom as an unrelated pre-existing gap.** In the previous commit
  I noted that the preset name never populated and called it a data gap. It was
  the same boot hang: the render loop never started, so the readout never ran. I
  had two symptoms of one cause and treated them as two facts.
- **My first fix attempt to the probe blamed the app, twice.** When a real
  gesture failed to unblock it and the autoplay flag failed too, I nearly
  concluded the audio theory was wrong. Both were my instrument again — a
  programmatic `.click()` is not a user gesture, and my isolated-context probe
  returned `{}` because I forgot `awaitPromise`, so it had told me nothing at all
  while looking like a result.
- **I shipped a feature whose first end-to-end run refused its own inputs.** Cross
  rejected two worlds I had generated seconds apart from the same lane. My
  instinct was that my guard misfired; the guard was right and my mental model
  was wrong — the lane rerolls kernel as well as genome.

## Error → fix → repeat ledger

| error class | recurrences this session | previously written up? | what actually stopped it |
|---|---|---|---|
| Believed a negative from an unvalidated instrument | 2 (programmatic click read as "gesture didn't help"; `{}` from a missing `awaitPromise` read as a result) | **Yes** — written up by me yesterday, in this corpus | Printing the instrument's own state beside every claim: renderer string, hit-test target, `awaitPromise` result. Down from 4 to 2 |
| Deferred to the owner a check I could automate | 1 | Yes (Rule 49) | Asking "whose machine am I on?" before writing "please check" |
| Treated a symptom as an independent finding | 1 | No | Re-reading prior notes after finding a root cause, to see what it also explains |
| Assumed same source implies same type | 1 (same lane ⇒ same kernel) | No | Reading the stored record instead of reasoning about it |

The first row is the one I am tracking across sessions. It went from four
recurrences to two once I made the instrument print its own state as part of
every claim, rather than promising to be careful. That is evidence the
procedural form of the correction works where the exhortative form did not.

## The transferable finding

`await this.context?.resume().catch(() => undefined)` looks defensive. It has a
`?.`, it has a `.catch`, it is one line, and it survived every review this
project has run. It hung the entire application.

An `AudioContext` created without a user gesture is *suspended*, and calling
`resume()` on it returns a promise the browser leaves **pending indefinitely**
until autoplay is unblocked. It does not reject. So the `.catch` is decoration —
there is no error to catch, and there never will be. The `await` simply never
returns. Lane activation never completed, the registry's `busy` flag stayed true
for the life of the page, and every scene switch silently early-returned at its
guard. No exception, no console error, no failing test.

The visible symptom was maximally misleading: the chrome showed a scene title, a
pressed scene button and a lit lane badge, all of which I read as "the app is
sitting on this scene". They were **static HTML defaults**. Boot never reached
the code that sets them. The app had never finished starting.

Three things generalise:

1. **A pending-forever promise is a distinct failure mode from a rejection, and
   nothing in the error-handling vocabulary addresses it.** `try`/`catch`,
   `.catch()`, error boundaries and rejection handlers are all keyed to
   settlement. Any `await` on a platform promise gated by user consent —
   autoplay, permissions, storage access, fullscreen, device pickers — is an
   availability hazard unless it is raced against a timeout or not awaited at
   all. The question to ask at every such await is not "what if this fails" but
   **"what if this never answers".**
2. **The right fix was to notice the await was never needed.** This lane never
   taps the audio graph; it is handed waveform bytes explicitly on every render.
   Resuming audio was opportunistic, and gating activation on it was the whole
   bug. A dependency that is not a precondition should not be awaited like one.
3. **Green tests were evidence of nothing here, because every double modelled a
   cooperative platform.** A fake that always resolves cannot express "the
   browser declines to answer". Test doubles encode assumptions about the world,
   and an assumption shared by every double in a file is invisible — which is
   how 499 passing tests coexisted with an application that never finished
   booting.

## External-model calibration

No paid model was consulted. The routing note stands and is now stronger: **for
this class of defect the decisive instrument is a real browser on real hardware,
not a reviewer.** No model reading this diff would have found it — the line is
short, guarded, and reads as careful. It took printing the lane's own progress
markers and watching one of them never advance.
