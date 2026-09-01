---
date: 2026-09-01
originating_model: claude-fable-5
title: A negative control must be invisible to the check it replaces
models_used:
  - model: claude-fable-5
    role: sole agent
    did: closed the Install-Krea2.ps1 finding-4 sibling gap, downloaded + SHA-verified Krea 2, proved the install with a headless render on the 5090
    cost: subscription
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: two broken instruments in one session each printed a false "clean/OK" from their own error path
  - id: rule-20-sibling-sweep
    change: reinforced
    failure: the finding-4 fix had landed in one installer and not its sibling; the handoff caught it, this session closed it
---

# A negative control must be invisible to the check it replaces

When you upgrade a verifier (size-within-2% → pinned SHA-256), the negative control that proves the
upgrade must be a case **only the new check can catch**. My first control — wrong-content dummy
files — was rejected, but those dummies also had the wrong size, so the OLD check would have
rejected them too. That test proved "some verification runs," not "the hash check works." The
control that actually proves the upgrade is the **flip-one-byte** test: corrupt one byte of the real
file so the size is unchanged, confirm exit 1, restore the byte, confirm exit 0. Size-invisible,
hash-visible. General form: pick the negative control from the difference between the old and new
instruments, not from the space of all bad inputs.

## Who did what
claude-fable-5, alone, no external models. It also made every mistake below.

## Skills created or changed
None created. `instrument-check` and the Rule 20 sibling-sweep discipline both reinforced by live
hits (see ledger).

## Mistakes I made
- Wrote an ASCII check whose instrument (`grep -P`) errored on this platform, and whose `||` fallback
  converted the error into a printed "ASCII clean" — a false negative born from the instrument's own
  failure. Fix: `LC_ALL=C grep -c` with the exit code read directly.
- Wrote a PowerShell parse check that itself failed to parse (`[ref]` on an undeclared variable) and
  then printed "parse OK" because the error left the error-collection variable empty. Fix: declare
  the variable, and run a positive control (deliberately broken input) proving the parser reports
  errors at all.
- Ran a negative control (wrong-content dummies) that the retired size check would also have caught,
  and initially treated it as proof of the hash check. Fix: the flip-one-byte control above.

## Error → fix → repeat ledger
- **Instrument prints "clean" from its own error path** — recurred **2x this session** (grep
  fallback, PSParser check) before the pattern was named. Both were caught by reading the error
  lines above the verdict rather than trusting the verdict. Procedural fix that survives: never pair
  a check with a `||`/empty-default that can speak for it; read the instrument's own exit/stderr,
  and run a positive control before believing any "clean."
- **Weak negative control** — 1x, corrected same session with the size-invariant variant.

## External-model calibration
None consulted this task.
