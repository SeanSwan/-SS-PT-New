# Consult reply — Ox Alpha (stealth/ox-alpha) — 2026-08-23T21:53:50.386Z

> tokens: prompt=10087 completion=1233 | finish_reason: stop | max_tokens: 60000

## Verdict: CLEAN — usable under pressure, with two small stitches

The core loop works. One bit of evidence (build colour), four rows, each row names its action, the lookalike fields are defused inline, the decoy backup tools are named *at the moment of temptation* (step 2), and the forward-fix now travels the same escalation gate as the restore. The STOP box front-loads both discovery-costs (prod-pointing URL, dashboard access). A skimming responder can classify and act. Three residual nits, ranked by cost:

### 1. Row 4 ("no attestation at all") routes around the freeze — that's backwards for this scenario
The table sends the no-attestation reader "straight to step 3," skipping FREEZE. But your own premise is **production is broken**, and no attestation means the migration ran through the *unguarded* pipeline — i.e., the exact world where an interleaved second deploy is most likely and least visible. Skipping the freeze is only right when there's no evidence of failure; you've stipulated failure. Fix: change the Do cell to "**freeze (step 1), then go to step 3**" — or add "(freeze anyway if the service is visibly broken)". Cost of the current wording: a tired engineer who trusts the table leaves auto-deploy on during diagnosis.

### 2. Step 3 doesn't say *where* to run the SQL
Step 0.2's table (which the 2am reader hasn't seen) trains "anything touching the DB from your shell = NO." Step 3 then asks them to run a `SELECT` against `"SequelizeMeta"` — from where? A cautious reader stalls; a reckless one opens a write session while they're at it. One sentence fixes it: *"This is a read-only query — safe to run from your machine against `DATABASE_URL`, or via the dashboard's query/console if it has one. Read-only means read-only: no `UPDATE`, no `DELETE`."*

### 3. Step 5's unfreeze instruction has an unstated blast radius
"Unfreeze, deploy the fix, confirm, then re-freeze" is correct for the fix — but unfreezing deploys **everything on `main`**, including any commits that landed while frozen. At 2am post-incident, main may contain exactly the commit whose migration caused this. Add half a line: *"Check what else is on `main` before unfreezing — unfreezing deploys all of it, not just your fix."*

### Non-issues I checked and cleared
- **Row 3 ("treat as RED")** correctly refuses to assume the deploy migrated — the asymmetry with the old version's optimism is fixed.
- **`locked` vs `lockVerified`** inline callout is sufficient without 7.1.
- **Step 4's "restore point UNKNOWN"** honestly blocks the most dangerous tired assumption (that snapshots are nightly).
- **Step 6 covering destructive forward-fixes** closes the loophole Round 19 found; "the recommended path is not an exemption" is the right sentence.
- **Decoy naming in step 2** is placed exactly where a frozen brain reaches for muscle memory.

Apply #1 before calling this done; #2 and #3 are one-liners. With those three words changed, section 9 stands alone.
