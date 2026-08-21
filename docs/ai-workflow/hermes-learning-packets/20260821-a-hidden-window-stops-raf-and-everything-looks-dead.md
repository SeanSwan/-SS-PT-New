---
title: "A hidden window stops rAF entirely — and every rAF-driven feature reads as broken"
date: 2026-08-21
originating_model: claude-fable-5
tier_basis: "claude-fable-5 is Fable itself — the anchor of the Rule 68 allowlist; this session ran as Fable 5 and authored every fix and verification in this packet."
decision: "A CDP probe of an rAF-driven page must print {visibilityState, rafTicks, renderer} and refuse to report a functional negative unless visible, ticking, and on the real GPU; drive such probes with --headless=new --enable-gpu."
status: shipped
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
surface: swan-visualizer (applies to ANY browser-driven verification on any Swan repo)
models_used:
  - model: claude-fable-5
    role: builder + hostile reviewer + verifier
    did: "Built both panel-mandated experiment harnesses; found 2 real defects in own hostile round; misdiagnosed an instrument failure as code failure for 3 probe runs before isolating it"
    cost: subscription
skills_touched:
  - id: "validate-the-instrument lesson class (learning corpus, 3rd member)"
    action: amended
    motivating_failure: "Two clean hostile-probe FAILs were produced by the probe's own browser window being backgrounded, not by the code under test"
---

## The lesson

A Chrome window that is not foreground can report `document.visibilityState === 'hidden'`
(minimized, fully occluded, or focus-stolen — occlusion tracking makes "covered" count as
hidden). When it does, **requestAnimationFrame stops COMPLETELY — zero ticks — while
`setTimeout` keeps running.** Any app whose main loop is rAF-driven (the visualizer's render
loop, and anything animated in SS-PT) then looks entirely dead to a CDP probe: overlays mount,
buttons click, storage writes — but nothing advances. The failure signature is *coherent
partial life*, which reads exactly like a logic bug in the feature under test.

What did NOT fix it, in order tried:
1. `--disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows
   --disable-renderer-backgrounding` — window still went hidden.
2. `Page.bringToFront` — worked exactly once, then something re-stole foreground (an agent
   cannot control the desktop's focus on Sean's machine).

What fixed it: **`--headless=new --enable-gpu`.** Headless-new pages report
`visibilityState: 'visible'`, run rAF at full rate, and — verified by printing the renderer
string — still use the real GPU (`ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 ... D3D11)`), so it
does not violate the standing no-swiftshader rule.

**The procedural correction** (what actually prevents the repeat, per the ledger discipline):
any CDP probe of an rAF-driven page MUST first print `{ visibilityState, rafTicksIn2s,
renderer }` and refuse to report a functional negative unless visibility is `visible`, ticks
> 0, and the renderer is the real GPU. Three lines of preamble; it would have converted three
misleading runs into one honest error.

## Who did what

Fable 5 alone; no paid seats fired. Fable both introduced the wasted runs (headed launch,
trusting bringToFront) and isolated the cause (direct `document.visibilityState` + rAF-tick
diagnostic instead of a fourth hypothesis).

## Skills created or changed

No skill file written. This packet extends the corpus's "validate the instrument before
believing a negative" class — already the project's most expensive recurring error (fired 4×
in one prior session as stale-dev-server and swiftshader variants; this is a third distinct
mechanism producing the same false-negative shape).

## Mistakes I made

- Diagnosed two probe FAILs as code defects and considered patching product code before
  checking the instrument — the corpus warned about exactly this shape, in this repo, twice.
- Checked `$?` after a pipe (`npm test | tail`) minutes after reading the handoff section that
  names that trap; the gate would have passed on a red suite.
- Wrote a probe readback that verified values the probe itself had set (slider positions) —
  proof-shaped, proving nothing. Replaced with a readback through the persisted favourites
  store, the only channel that shows what the engine actually adopted.

## Error → fix → repeat ledger

| error class | recurrences this session | previously documented? | what stopped it |
|---|---|---|---|
| believed a negative without validating the instrument | 2 probe FAILs, 3 wasted runs | YES — twice in corpus | mandatory `{visibility, rafTicks, renderer}` preamble before any probe verdict |
| piped exit code masks test failure | 1 | YES — handoff §8 names it | `set -o pipefail` + PIPESTATUS, immediately |
| self-referential probe readback (asserting values the probe wrote) | 1 | no | readback through a persisted store the engine writes, never the probe |

The repeat column is the signal: the instrument-validation class has now fired across three
different mechanisms despite two prior write-ups. Write-ups alone are not the fix — only the
mandatory preamble check is procedural, so it is the correction of record.

## External-model calibration

No external models consulted this session ($0). The two real defects and both instrument
failures were found and resolved by the local build→hostile→verify loop.
