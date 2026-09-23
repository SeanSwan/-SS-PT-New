# R6 ADDENDUM — read this before the R5 packet below

**Added by:** the WorkBuddy seat (Sable), 2026-09-20 00:35 PDT
**Supersedes:** the R5 request's transport assumptions only. The R5 scope, mandate and lane
description stand unchanged.

---

## A. A correction to the record — R5 did NOT run at `high`

The R5 request (and the operator's belief at the time) recorded the pass as
`model: gpt-6-astra, reasoning effort: high, sandbox: read-only`.

**That was wrong, and the error was structural rather than clerical.** The codex-cli transport
built its argv as:

```
exec --json --ephemeral --sandbox read-only -C <root> --model gpt-6-astra -
```

It passed `--model` and **no effort flag at all**. `model_reasoning_effort` therefore came from the
ambient `$CODEX_HOME/config.toml`, which on this machine ships `"low"`. The transport also passes
`--ephemeral`, which suppresses the rollout log, so there was no session record to inspect
afterwards either. And the R5 `.meta.json` carries **no effort field**, because nothing in the
invocation carried one.

**Conclusion: R5 executed at `low`.** [LIKELY] — inferred from two proven facts (the argv contains no
effort flag; the ambient config says `low`), not read off the run, because the run left no record.
Its `reasoningOutputTokens: 3445` is not a counter-argument: that field is not a scale (see D below).

**This pass runs at `xhigh`, and the level is on the argv as
`-c model_reasoning_effort="xhigh"`.** It is recorded in the reply header and the `.meta.json`.
Treat this as a genuinely deeper pass, not a repeat of R5.

## B. What changed in the lane since R5

Fixed and re-verified since the R5 pass — **do not re-report these as open**:

| R5 finding | Disposition |
|---|---|
| A1-01a | fixed, RED-then-GREEN reproduced |
| A1-01b | fixed, RED-then-GREEN reproduced |
| A1-02 | fixed, RED-then-GREEN reproduced |

Lane state at this pass: **14 files / 120 tests green**, scoped `tsc` 0 errors, `npx vite build`
✓ 33.75s, out-of-lane consumers 12 tests green, Rule 4 green (largest file 296).

## C. Your own R5 findings, put back to you for adjudication

For **each** of the five below, state plainly:

1. **Is it still reproducible** from the file:line you cited? If you can no longer reproduce it,
   say so — a finding withdrawn is worth more than a finding repeated.
2. **Has your recommendation changed** now that you are reasoning at a greater depth?
3. **What is the smallest change that closes it?**

| id | severity | your R5 claim, in one line |
|---|---|---|
| A1-03 | HIGH | contrast instrument's background recipes are hand-entered (`themeContrastInstrument.ts:147–152,184–245`) and its stylesheet inventory is a literal array (`:155–159`), so a changed wash or a newly imported stylesheet escapes measurement |
| A1-04 | MEDIUM | the pre-paint suite checks source strings and a **substitute** seed (`themePrePaint.test.ts:128–164`), not the real bootstrap at `frontend/index.html:94–219` |
| A1-05 | MEDIUM | component tests pass **mocked** callbacks (`ThemeLensPopover.test.tsx:25–43`), so the mounted chain `radio → toggle → provider → CSS variables → storage → peer tab` is unproven |
| A1-06 | MEDIUM | declared ranges vs installed versions are conflated (React `^18.2.0` → **18.3.1**; framer-motion `^10.16.5` → **10.18.0**; styled-components `^6.1.6` → **6.1.19**) |
| A1-07 | MEDIUM | the packet calls six colours a "closed token set" while §2 requires preserving 28 registered themes — a builder cannot resolve that |

**Then go past them.** R5's findings are the floor, not the target. At `xhigh` you have depth you did
not spend last time: use it on what R5 did **not** find. Specifically, answer:

- **What in this lane is unguarded rather than badly guarded?** A test that passes for the wrong
  reason is a different defect from a test that is missing.
- **Where does a green suite certify a broken invariant?** Name the invariant and the guard's blind
  spot.
- **What does the lane claim that it cannot demonstrate?** R5's own guard-disposition line is the
  template: *"Twelve lane test files exist. Their reported 114 green tests were not rerun."*

## D. A measurement caution — do not use `reasoning_output_tokens` as a scale

`reasoning_output_tokens` is the only field that can corroborate which effort ran, and it is
captured. But it is **not** a general proxy. Measured 2026-09-20 on the trivial prompt `say OK`, it is
**0 at both `low` and `xhigh`** — zero because no reasoning was required, not because effort was low.
It discriminates only on prompts that demand reasoning, and only within one prompt. Do not compare
token counts across different prompts.

## E. Still owed to the operator — do not re-litigate, but do not lose it

Your R5 technology mandate answer was **"No GSAP, R3F, Drei, postprocessing or icon installation."**
That is a decision Sean owns and it has **not** been answered by him. Restate your recommendation if
your deeper pass changes it; otherwise note that it is unchanged and still awaiting his word.
