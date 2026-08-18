# HOSTILE ROUND H3 — confirmation round

H2 found and fixed two more defects, so H2 was a FIX round and cannot be the confirming round. This is H3: attack the H2 fixes plus everything prior. A round that finds nothing here, following a clean H2 verdict, is the second consecutive clean round.

## Changed since H2
- frontend-guards.test.mjs: script path resolved from import.meta.url. It previously spawned a RELATIVE path, so the suite passed 20/20 from the repo root and 6/20 from any other cwd — 14 tests silently stopped exercising the guard while still reporting.
- No production-code change since H2; the drift checker, G5/G6 and the token checker are byte-identical to the H2 packet.

## Evidence gathered at H2 from vantages not used in H1
- Ran every tool from a FOREIGN cwd. token-registry-check correctly refuses with exit 2 and a named error. frontend-guards.test.mjs was the only cwd-dependent artifact; now fixed and verified 20/20 from both the repo root and /c/tmp.
- Composite-FK duplication probed empirically: 0 composite FKs exist; the unnest query emits exactly 396 rows for 396 constraints, so no multiplication occurs today. Known bound if a composite FK is ever added.
- FK parity: pg_constraint count == information_schema count == 396; FKs targeting lowercase users == 0, so FK_TARGET_DRIFT reporting nothing is correct rather than broken.

## Attack
1. Is the cwd fix complete, or do other artifacts still depend on the invocation directory?
2. Does anything in these tools depend on ambient state not yet varied — env vars, git state, locale, line endings, symlinks?
3. Re-examine any H1/H2 finding you previously called SOUND and try to break it now.
4. What have BOTH rounds missed because both reviewers share the same blind spot?

Say SOUND where sound. Do not manufacture findings to appear useful — a genuinely clean round is the expected outcome if the work is done. End with: DRY or NOT DRY.
