# Committed is not shipped: a finished fix sat on a branch while production stayed broken

**Surface:** backend — models vs live DB schema
**Issue:** SWA-87 (landed from the SWA-71 cleanup lane)
**Agent:** terminal Claude Opus 5 · provenance sub-Fable → working memo only, no learning packet
**Landed on main:** `f8f17ddd5` (was `5ad5fd4fc` on `fix/swa87-schema-truth-20260729`)

## What happened

A completed, committed, reviewed fix for **three production-broken models** had been sitting on an
unmerged branch. Production still ran the broken versions: `TrainerPermissions` (8 attributes mapped
to columns that do not exist), `FoodScanHistory` (8), `UserAchievement` (33). The handoff docs
referenced the fix as done — because it *was* done. It just was not on `main`.

It is now landed and verified. Post-landing baseline: **0 column-drift across all 154 comparable
models**, down from 49. That one commit was the entire column-drift surface.

## The lessons worth keeping

**1. "Committed" and "shipped" are different states, and docs conflate them constantly.** The
authoritative check is one command — `git merge-base --is-ancestor <sha> origin/main` — not a
handoff sentence saying the work is complete. Any claim that a fix is live should be backed by that,
or by the deployed artifact. Worth checking whenever a doc says something is fixed and the symptom
is still reported.

**2. Verify the rebased tree, not the pre-rebase one.** Main moved *between* my verification and my
push (someone landed a federated-auth feature). The push was correctly rejected. The temptation is
to rebase and push immediately, since the earlier verification "already passed" — but it passed
against a tree that no longer exists. Re-ran the drift check and the import smoke **after** the
rebase. Both still clean, so nothing changed — but that was a finding, not an assumption.

**3. A "removed field" sweep is dominated by name collisions, and the raw list will scare you off a
correct change.** Grepping the 33 removed attribute names returned ~120 files and looked
catastrophic. Almost all of it was other models owning the same field names — `Goal.progressPercentage`,
`Achievement.maxProgress`, `Session.remindersSent`, `RecoveryActivityLog.xpAwarded`. Intersecting
"references a removed attribute" with "references one of the three models" cut it to **6 files**,
and inspection cleared all six. The decisive evidence was a comment already in the codebase
(`gamificationController.mjs:422`) explaining that the model defined fields the table lacked, so
queries *had* to use explicit attribute lists — the codebase had been working around this exact
drift, which is corroboration that removing them was right.

**4. When a destructive verification step is blocked, find a non-destructive equivalent — it is
often better evidence.** `git reset --hard` to produce a before/after control was refused. The
substitute — parsing the model source **blobs straight out of git refs** and diffing against the
live schema — needed no checkout, mutated nothing, and produced a *second independent method* that
agreed with the runtime introspection. Two methods agreeing beats one method with a riskier setup.

## Watch item

The auth feature landed just before this carries two brand-new models whose tables do not exist yet
(`auth_identities`, `magic_login_tokens`). That is the correct path — their migrations are pending
and should run on deploy. But if a deploy's migration step silently does not run, those tables stay
absent and the feature breaks. This repo already has three migrations recorded as APPLIED whose
tables do not exist, so that failure mode is not hypothetical here.

No PII, no secrets, no credentials — model/table/column names and numeric ids only.
