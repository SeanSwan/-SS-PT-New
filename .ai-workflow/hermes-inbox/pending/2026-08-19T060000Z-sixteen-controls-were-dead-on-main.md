# Hermes memo — 16 security controls were dead on main, and nothing had changed

**Surface:** vs-claude (Opus 5) · **Session:** main-s2e2f8326 · **UTC:** 2026-08-19T06:00Z
**Branch:** `claude/qa-harness-slice0-20260811` — **PUSHED, and open as PR #51** (2026-08-19T23:00Z).
Merged `origin/main` in first and re-verified on the merged tree: no conflicts, 16/16 controls,
audit exit 0. Delivery state is `pushed-branch`, NOT `merged-to-main` — the controls stay dead on
main until #51 lands.
**Packet:** `20260819-a-dead-suite-survives-every-mutation.md`

---

## What happened

Audited my own authorization work against a branch that had moved ~200 commits in two days. The
work survived the rebase intact and the reader corrections are live on `origin/main`.

**But all 16 control tests over that instrument were reporting ZERO tests** — on main, right now.
Not failing. Dead. Those controls exist for exactly one purpose: to stop the security reader from
going soft and clearing unprotected handlers.

Neither file had changed — the original blob diffs byte-identical to HEAD ignoring CR, and no
commit touched either. **The toolchain moved underneath a file that was already correct.**

**Mechanism, isolated in two arms** (my first commit named only half of it and I corrected the
record in a follow-up):

```
shebang + LF        -> 16 passed
shebang + CRLF      -> no tests      <- what shipped, after checkout normalisation
no shebang + CRLF   -> 16 passed     <- the fix
```

esbuild fails to strip a shebang whose line ends `\r\n`; `node` strips it correctly, which is why
the CLI kept working perfectly and showed no symptom for two days. The failure is reported as
`(0 test)` against the **importing** file, so the error points away from the guilty module.

**Latent class, not one file:** `core.autocrlf=true`, `.gitattributes` pins `eol=lf` for
`scripts/*.sh` only, and **172 shebang-bearing `.mjs`** files live under `scripts/` +
`backend/scripts/`. Each is one `import` away from the same silent death.

## The transferable bit

**Mutation testing — the strongest discipline we have — is blind here.** Measured:

| suite state | mutated? | reviewer sees |
|---|---|---|
| dead | no | `Test Files 1 failed` · `Tests no tests` |
| dead | **yes** | `Test Files 1 failed` · `Tests no tests` — **identical** |

A mutation against a suite that does not run produces exactly what the unmutated dead suite
produces, *with a red line on screen*, which is worse than silence. **Assert a positive test COUNT
before trusting any mutation result.** `16 passed` and `no tests` are both "not failing"; only one
is evidence.

## Mistakes I made

- **I shipped a commit whose stated mechanism was half right** — named the shebang, missed the CRLF.
  The fix was correct, so nothing broke, but the next agent would have found 171 healthy shebang'd
  scripts and concluded my note was wrong. A correct fix with a wrong reason is a trap.
- **I ran the right experiment on the wrong file.** Tested the line-ending hypothesis by converting
  the *test* file to LF; the imported *script* was the one that mattered. Correct hypothesis,
  disproved by aiming one file to the left, then written off entirely.
- **I built a bisect harness that could not produce a valid answer** (appended `});` to arbitrary
  truncations → unbalanced braces), and read two results off it before noticing.
- **I claimed "no non-ASCII" from a broken probe.** `grep -P` is unsupported here, my fallback did
  nothing, and I read empty output as a negative result. The file was full of em-dashes. Third
  instrument-lies incident this lane — the fix that works is a **known-positive control**: point the
  probe at something it must find, and only believe a null result if the positive lights up.
- **I generalised from two samples to 172.** The two healthy shebang'd scripts are `readFileSync`'d
  by their tests, never imported — not counter-examples, a different case.

## External-model calibration

**No external calls, correctly.** Every finding came from running commands against a live tree. A
paid reviewer would not have found this: the code was correct, and the defect lived in the
interaction between a checked-out file and a transform. **This class is invisible to review and only
visible to execution** — review and running are not substitutes.

## For the next agent

Handoff: `docs/ai-workflow/AI-HANDOFF/AUTHZ-INSTRUMENT-HANDOFF-2026-08-19.md` — verify-first, opens
with three commands to run before trusting anything in it.

Ranked next slices: push the fix → executed two-user negative harness (the only thing that turns
"190 cleared" into evidence) → resource-shaped IDOR (**251 handlers** outside the instrument
entirely) → content-hash the baseline → split reader into library+CLI (590 lines vs a 300 cap) →
the 18 zero-test files → `*.mjs text eol=lf`.

## Owner-gated

1. ~~Push~~ **DONE** — pushed with an explicit refspec, upstream unset (it was misconfigured to
   `main`, which is deploy-linked). **Now: review and merge PR #51.** Until it lands, the 16
   controls remain dead on `main`. Also synced to Linear SWA-134 (this work is its item 4).
2. **`GET /keys/:userId`** — confirm auth + that the limiter counts victims, not spellings.
3. Carried: rotate the Render API key; DMARC record.
