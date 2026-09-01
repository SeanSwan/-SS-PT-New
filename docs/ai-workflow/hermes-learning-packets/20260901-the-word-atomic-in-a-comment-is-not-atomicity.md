---
name: the-word-atomic-in-a-comment-is-not-atomicity
date: 2026-09-01
originating_model: claude-fable-5
surface: Aftertaste/H3 pipeline (ComfyUI tooling, Blender asset pipeline, GitHub Actions)
models_used:
  - model: claude-fable-5
    role: Final Decider — built the work, triaged the external review, wrote the fixes
    did: Confirmed all six external findings against the files; fixed each with a check that can fail; rendered a real 4K clip; got CI to run for the first time.
    cost: subscription
  - model: unknown external reviewer (relayed by Sean)
    role: hostile review of 8 commits
    did: Returned REVISE with 6 technical findings (all real, incl. a data-loss bug) and 1 scope claim (rejected).
    cost: unknown
skills_touched:
  - id: HOSTILE-REVIEW-PLAYBOOK.md
    change: amended
    failure: The playbook had no section on reviews arriving from OUTSIDE, so there was no written stance between "defend the work" and "accept everything".
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: "No actual upscale has been rendered" was disclosed honestly and then left standing for a day, when rendering one took three minutes.
---

# The word "atomic" in a comment is not atomicity

## The lesson

**A comment describing a property is not the property.** `swan_pipe.py` carried the phrase
"atomically swapped in" directly above:

```python
shutil.rmtree(out_dir, ignore_errors=True)
os.replace(tmp_dir, out_dir)
```

That is the opposite of atomic: it deletes the last good output, then tries to install the new one.
Any failure in the window — crash, full disk, AV lock, cross-device replace — leaves the asset with
nothing. The comment had been read by several passes, including mine, and read as reassurance.

The generalisation: **words that assert a safety property are the highest-value things to distrust in
a codebase**, precisely because they stop people looking. "atomic", "validated", "verified", "safe",
"idempotent". Each one is a claim with an implementation that can be read in under a minute.

The corrected shape, which is worth memorising because the wrong one looks fine:

```python
backup = out + ".prev"
if exists(out): os.replace(out, backup)   # move the good one ASIDE
try:    os.replace(tmp, out)              # install the new one
except: os.replace(backup, out); raise    # put the good one back
rmtree(backup)                            # only now is it safe to drop
```

## Who did what

- **The external reviewer was right six times out of six on technical claims**, including the
  data-loss bug, which I had read past. It was wrong once, on scope ("there is no website"), which
  was never specified for this lane.
- **Fable 5 (me) wrote every one of the six defects**, then confirmed and fixed them. This is not a
  packet about someone else's mistakes.
- The tell that separated the reviewer's good findings from its weak one, and which is now the
  triage rule: **a real finding names a line or a config key you can open, or describes a failure
  WINDOW. A weak one describes a product shape.**

## Skills created or changed

- **HOSTILE-REVIEW-PLAYBOOK.md — "When the review comes from outside".** An external review has the
  same standing as a subagent's output: claims to verify, not a verdict to accept or defend. Written
  because the failure mode is symmetric — reflexive defence would have kept a data-loss bug, and
  reflexive acceptance would have had me building an unrequested web product.
- **Rule 73 reinforced.** Disclosing an unproven claim is honest, but it is not a substitute for
  proof when proof is cheap. "No upscale has been rendered" stood for a day; the render took
  three minutes and produced ffprobe-confirmed 3840×2160/48fps.

## Mistakes I made

- Named a workflow "Upscale to 2K-4K" that contained no RIFE, no ESRGAN, and a 2× resize — after
  installing RIFE and ESRGAN in the same session.
- Shipped size-±3% as "verification" hours after writing a playbook section called *"negative
  controls, or the verifier is a decoration"*. I never asked what a corrupted file of the right
  length would do.
- Added a CI gate and never checked that it ran. It was `branches: [main]`; it had executed zero
  times on the branch that introduced it.
- Put a bug inside the fix — `%URL%system_stats`, missing the slash — caught only by running it.
- Left "no actual upscale rendered" as a disclosure instead of a three-minute render.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| A claim in prose that the code does not implement ("atomic", "verified") | 3 (swap comment, workflow name, launcher banner) | Yes — Rule 75 / playbook §8 | Reading the implementation under the claim. Nothing else has ever caught this. |
| A verifier with no failing path (size ±3%) | 1 | **Yes — I wrote the section on it the same day** | A negative control: flip one byte, require exit 1 |
| A gate/test that exists but never executes | 2 (CI on branch, new selftest not in CI) | Yes — playbook §9 | Asking the runner what it ran (`gh run list`), not reading the YAML |
| Magic-number / path typo introduced inside a fix | 1 | Yes (twice on 2026-08-31) | Executing the command instead of reviewing it |

**The repeat that matters:** I wrote "negative controls, or the verifier is a decoration" and then,
hours later, shipped a decoration. Writing a lesson down does not install it. What installed it was a
mechanism — the corrupted-byte test now lives in the installer's own verification path, so the next
person cannot ship size-checking without deleting a test that fails.

## External-model calibration

- **Unknown external reviewer, one pass:** 6/6 real on technical findings, 0/1 on scope. Worth the
  interruption. Route future reviews of this kind at *implementation* claims, not product direction.
- **No paid seat consulted.** The work was verifying six specific claims against files on disk, which
  is exactly what a hostile loop is for.
